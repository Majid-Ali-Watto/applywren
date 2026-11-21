import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Application from "@/models/Application";
import Document from "@/models/Document";
import { currentUserId } from "@/lib/accounts";
import { AUTH_FAILED, senderTransport } from "@/lib/mailbox";
import { groupByCompany } from "@/lib/applications";
import { senderFields } from "@/lib/autofill";
import { readJson, errorResponse } from "@/lib/http";
import { assertRoomFor, decodePdf, fileHash, storeFile, MAX_LETTER_CHARS } from "@/lib/documents";
import { missingFields, normalizeKey, renderTemplate } from "@/lib/template";
import { assert, isEmail, isNonEmptyString } from "@/lib/validate";
import {
  DAILY_RECIPIENT_LIMIT,
  MAX_ATTACHMENTS,
  MAX_COPY_RECIPIENTS,
  MAX_FILES_PER_SEND,
  MAX_LETTERS_PER_SEND,
  MAX_RECIPIENTS_PER_SEND,
  MAX_SEND_BODY_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
  MAX_UPLOAD_BYTES_PER_SEND,
} from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FIELDS = 20;
const MAX_FIELD_CHARS = 500;
const SEND_DELAY_MS = 1000; // spacing between messages to stay under provider throttling

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isIndex = (value, length) => Number.isInteger(value) && value >= 0 && value < length;

/**
 * Request body:
 *   attachments: [{ name, base64 }]                 files shared by all letters
 *   messages:    [{ html, attachments: [index] }]   letters, e.g. one per role
 *   recipients:  [{ email, fields, message, cc, bcc }]
 *                message = index into messages; cc/bcc are for that email only
 *   subject
 *   copyMe:      true to BCC every email to the sender's own address
 */
function parseAttachments(list) {
  assert(Array.isArray(list) && list.length > 0, "Attach at least one file");
  assert(list.length <= MAX_FILES_PER_SEND, `Use at most ${MAX_FILES_PER_SEND} different files per send`);
  const files = list.map((file) => ({ name: String(file?.name ?? "").trim(), bytes: decodePdf(file) }));
  const total = files.reduce((sum, f) => sum + f.bytes.length, 0);
  assert(total <= MAX_UPLOAD_BYTES_PER_SEND, "Files exceed 30 MB in total");
  return files;
}

function parseMessages(list, files) {
  assert(Array.isArray(list) && list.length > 0, "Cover letter is required");
  assert(list.length <= MAX_LETTERS_PER_SEND, `Use at most ${MAX_LETTERS_PER_SEND} different letters per send`);
  return list.map((message, i) => {
    assert(isNonEmptyString(message?.html, MAX_LETTER_CHARS), `Letter ${i + 1} is empty or too long`);
    const indexes = message.attachments;
    assert(
      Array.isArray(indexes) && indexes.length > 0 && indexes.length <= MAX_ATTACHMENTS,
      `Letter ${i + 1} needs 1-${MAX_ATTACHMENTS} attachments`
    );
    assert(
      indexes.every((index) => isIndex(index, files.length)) && new Set(indexes).size === indexes.length,
      `Letter ${i + 1} has invalid attachments`
    );
    const bytes = indexes.reduce((sum, index) => sum + files[index].bytes.length, 0);
    assert(bytes <= MAX_TOTAL_ATTACHMENT_BYTES, `Letter ${i + 1}'s attachments exceed 15 MB`);
    return { html: message.html, attachments: indexes };
  });
}

function parseRecipients(list, messageCount) {
  assert(Array.isArray(list) && list.length > 0, "Add at least one recipient");
  assert(
    list.length <= MAX_RECIPIENTS_PER_SEND,
    `Send to at most ${MAX_RECIPIENTS_PER_SEND} recipients at a time`
  );
  const seen = new Set();
  return list.map((recipient) => {
    const email = String(recipient?.email ?? "").trim();
    assert(isEmail(email), `Invalid recipient email: ${email}`);
    assert(!seen.has(email.toLowerCase()), `Duplicate recipient: ${email}`);
    seen.add(email.toLowerCase());
    assert(isIndex(recipient.message, messageCount), `No letter selected for ${email}`);

    const entries = Object.entries(recipient.fields ?? {});
    assert(entries.length <= MAX_FIELDS, `Too many fields for ${email}`);
    const fields = {};
    for (const [rawKey, rawValue] of entries) {
      const key = normalizeKey(rawKey);
      // email and my_* values come from the server, never the client
      if (!key || key === "email" || key.startsWith("my_")) continue;
      assert(["string", "number"].includes(typeof rawValue), `Invalid ${key} for ${email}`);
      const value = String(rawValue).trim();
      assert(value.length <= MAX_FIELD_CHARS, `${key} is too long for ${email}`);
      if (value) fields[key] = value;
    }
    return {
      email,
      fields,
      message: recipient.message,
      cc: parseCopyList(recipient.cc, `CC for ${email}`),
      bcc: parseCopyList(recipient.bcc, `BCC for ${email}`),
    };
  });
}

function parseCopyList(list, label) {
  if (list == null) return [];
  assert(Array.isArray(list), `Invalid ${label} list`);
  const emails = [...new Set(list.map((e) => String(e).trim()).filter(Boolean))];
  assert(emails.length <= MAX_COPY_RECIPIENTS, `At most ${MAX_COPY_RECIPIENTS} ${label} addresses`);
  for (const email of emails) assert(isEmail(email), `Invalid ${label} email: ${email}`);
  return emails;
}

const SEND_SLOT_MS = (maxDuration + 60) * 1000; // a crashed send frees its slot after this

/** Marks the user as sending; false if another send is still running. */
async function claimSendSlot(userId) {
  const now = new Date();
  const claimed = await User.updateOne(
    { _id: userId, $or: [{ sendingUntil: null }, { sendingUntil: { $lt: now } }] },
    { $set: { sendingUntil: new Date(now.getTime() + SEND_SLOT_MS) } }
  );
  return claimed.modifiedCount === 1;
}

const releaseSendSlot = (userId) => User.updateOne({ _id: userId }, { $unset: { sendingUntil: 1 } });

/** Stored size of the files in this send that the user doesn't have yet. */
async function newFileBytes(userId, files) {
  const hashes = files.map((f) => fileHash(f.bytes));
  const stored = new Set(
    (await Document.find({ userId, type: "file", hash: { $in: hashes } }).select("hash").lean()).map((d) => d.hash)
  );
  return files.reduce((sum, f, i) => (stored.has(hashes[i]) ? sum : sum + Math.ceil(f.bytes.length / 3) * 4), 0);
}

async function recipientsSentToday(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [usage] = await Application.aggregate([
    { $match: { userId, appliedAt: { $gte: since } } },
    { $project: { n: { $size: { $ifNull: ["$recipients", { $ifNull: ["$mainEmails", []] }] } } } },
    { $group: { _id: null, total: { $sum: "$n" } } },
  ]);
  return usage?.total ?? 0;
}

export async function POST(req) {
  try {
    await connectDB();
    const userId = await currentUserId(req);
    const user = await User.findById(userId).select("email name phone link mailbox.host mailbox.port +mailbox.passwordEncrypted");
    if (!user) return Response.json({ error: "Account not found" }, { status: 401 });

    const body = await readJson(req, { maxBytes: MAX_SEND_BODY_BYTES });
    const files = parseAttachments(body.attachments);
    const messages = parseMessages(body.messages, files);
    const recipients = parseRecipients(body.recipients, messages.length);
    const copyMe = body.copyMe === true;
    assert(isNonEmptyString(body.subject, 300), "Subject is required (max 300 characters)");
    const { subject } = body;

    const sender = senderFields(user);
    const fieldsFor = (r) => ({ ...r.fields, email: r.email, ...sender });

    const incomplete = recipients
      .map((r) => ({ email: r.email, missing: missingFields([subject, messages[r.message].html], fieldsFor(r)) }))
      .filter((r) => r.missing.length);
    assert(
      incomplete.length === 0,
      "Missing placeholder values: " +
        incomplete.slice(0, 5).map((r) => `${r.email} (${r.missing.join(", ")})`).join("; ")
    );

    // One send at a time per account, so parallel requests can't each pass the
    // daily limit (or the storage check) before any of them is recorded.
    if (!(await claimSendSlot(userId))) {
      return Response.json({ error: "Another send is still in progress. Wait for it to finish." }, { status: 429 });
    }
    try {
      // Files not stored yet must fit in the account's storage.
      await assertRoomFor(userId, { bytes: await newFileBytes(userId, files) });

      const used = await recipientsSentToday(userId);
      if (used + recipients.length > DAILY_RECIPIENT_LIMIT) {
        return Response.json(
          {
            error: `Daily limit is ${DAILY_RECIPIENT_LIMIT} recipients; ${Math.max(
              0,
              DAILY_RECIPIENT_LIMIT - used
            )} left in the last 24 hours.`,
          },
          { status: 429 }
        );
      }

      // Copies are per email; "copy me" adds the sender to every email's BCC.
      const bccFor = (r) => {
        const list = copyMe ? [...new Set([...r.bcc, user.email])] : r.bcc;
        return list.length ? list : undefined;
      };

      // Mail goes out through the user's own mailbox, from their own address.
      const { transport, close } = await senderTransport(user);
      const mailFiles = files.map((f) => ({ filename: f.name, content: f.bytes, contentType: "application/pdf" }));
      const results = [];
      let signInRejected = false;
      try {
        for (const [index, recipient] of recipients.entries()) {
          // Once the provider rejects the app password, the rest would fail the same way.
          if (signInRejected) {
            results.push({ email: recipient.email, status: "failed", error: AUTH_FAILED });
            continue;
          }
          if (index > 0) await sleep(SEND_DELAY_MS);
          const message = messages[recipient.message];
          const fields = fieldsFor(recipient);
          try {
            await transport.sendMail({
              from: { name: sender.my_name, address: user.email },
              to: recipient.email,
              cc: recipient.cc.length ? recipient.cc : undefined,
              bcc: bccFor(recipient),
              subject: renderTemplate(subject, fields),
              html: renderTemplate(message.html, fields, { html: true }),
              attachments: message.attachments.map((i) => mailFiles[i]),
            });
            results.push({ email: recipient.email, status: "sent" });
          } catch (error) {
            console.error(`Send to ${recipient.email} failed:`, error);
            signInRejected = error?.code === "EAUTH";
            results.push({
              email: recipient.email,
              status: "failed",
              error: signInRejected ? AUTH_FAILED : String(error?.message || "Send failed").slice(0, 300),
            });
          }
        }
      } finally {
        close();
      }

      // Record one application per company + role + letter that received at least one email.
      const groups = groupByCompany(recipients.map((r, i) => ({ ...r, ...results[i] }))).filter((g) =>
        g.recipients.some((r) => r.status === "sent")
      );

      const storedIds = new Map(); // file index -> document id, stored on first use
      const documentId = async (i) => {
        if (!storedIds.has(i)) {
          const doc = await storeFile(userId, files[i].name, files[i].bytes, { archived: true });
          storedIds.set(i, doc._id);
        }
        return storedIds.get(i);
      };

      // Store the sender's details filled in; recipient placeholders stay so
      // history can show each recipient's version.
      const withSender = (text, html) => renderTemplate(text, sender, { html, only: true });
      const applications = [];
      for (const group of groups) {
        const message = messages[group.recipients[0].message];
        const resumeIds = [];
        for (const i of message.attachments) resumeIds.push(await documentId(i));
        applications.push({
          userId,
          company: group.company,
          role: group.role,
          recipients: group.recipients.map(({ email, fields, status, error }) => ({ email, fields, status, error })),
          ccEmails: [...new Set(group.recipients.flatMap((r) => r.cc))],
          bccEmails: [...new Set(group.recipients.flatMap((r) => bccFor(r) ?? []))],
          subject: withSender(subject, false),
          coverLetter: withSender(message.html, true),
          resumeIds,
        });
      }
      const saved = applications.length ? await Application.insertMany(applications) : [];

      return Response.json({ applicationIds: saved.map((a) => a._id), results });
    } finally {
      await releaseSendSlot(userId);
    }
  } catch (error) {
    return errorResponse(error, "Send emails");
  }
}
