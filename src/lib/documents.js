import crypto from "node:crypto";
import Document from "@/models/Document";
import { assert, isNonEmptyString } from "./validate";
import { MAX_COVER_LETTERS, MAX_FILE_BYTES, MAX_LIBRARY_FILES, MAX_STORAGE_BYTES } from "./limits";

export const MAX_LETTER_CHARS = 200_000; // HTML; a long styled letter is ~20k
export const MAX_NAME_CHARS = 200;

/** Validates an uploaded `{ name, base64 }` PDF and returns its bytes. */
export function decodePdf(file) {
  assert(file && isNonEmptyString(file.name, MAX_NAME_CHARS), "Each file needs a name");
  assert(typeof file.base64 === "string", `${file.name} has no content`);
  assert(file.base64.length <= Math.ceil(MAX_FILE_BYTES / 3) * 4, `${file.name} is larger than 10 MB`);
  const bytes = Buffer.from(file.base64, "base64");
  assert(bytes.length > 0 && bytes.length <= MAX_FILE_BYTES, `${file.name} is empty or too large`);
  assert(bytes.subarray(0, 5).toString("latin1") === "%PDF-", `${file.name} is not a PDF`);
  return bytes;
}

/**
 * Stores a file once per user, keyed by content hash. Files stored only
 * because an application used them stay archived (hidden from the manager);
 * an explicit upload of the same bytes makes them visible again.
 * Returns the document without its content.
 */
export function storeFile(userId, name, bytes, { archived }) {
  const hash = fileHash(bytes);
  const onInsert = { name, content: bytes.toString("base64"), createdAt: new Date() };
  const update = archived
    ? { $setOnInsert: { ...onInsert, archived: true } }
    : { $setOnInsert: onInsert, $set: { archived: false } };
  return Document.findOneAndUpdate({ userId, type: "file", hash }, update, {
    upsert: true,
    new: true,
    projection: { content: 0 },
  });
}

/**
 * Refuses to store more than an account's share: `adding` is "file" or
 * "coverLetter" (null for an edit), `bytes` the extra storage it needs.
 */
export async function assertRoomFor(userId, { adding = null, bytes = 0 }) {
  const [usage = { files: 0, letters: 0, bytes: 0 }] = await Document.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        files: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "file"] }, { $ne: ["$archived", true] }] }, 1, 0] } },
        letters: { $sum: { $cond: [{ $eq: ["$type", "coverLetter"] }, 1, 0] } },
        bytes: { $sum: { $strLenBytes: "$content" } },
      },
    },
  ]);
  assert(adding !== "file" || usage.files < MAX_LIBRARY_FILES, `You can keep up to ${MAX_LIBRARY_FILES} files. Delete some first.`);
  assert(
    adding !== "coverLetter" || usage.letters < MAX_COVER_LETTERS,
    `You can keep up to ${MAX_COVER_LETTERS} cover letters. Delete some first.`
  );
  assert(usage.bytes + bytes <= MAX_STORAGE_BYTES, "Your document storage is full. Delete some files first.");
}

/** The sha256 that dedupes a user's files. */
export function fileHash(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function validateLetter({ name, content }) {
  assert(isNonEmptyString(name, MAX_NAME_CHARS), "Cover letter needs a name");
  assert(typeof content === "string" && content.length <= MAX_LETTER_CHARS, "Cover letter is too long");
}
