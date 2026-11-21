"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/utils/api";
import { base64Size, formatBytes, htmlToText, readFileAsBase64 } from "@/utils/files";
import { groupByCompany } from "@/lib/applications";
import { autoFields, likelyResume, senderFields } from "@/lib/autofill";
import { buildSendBody } from "@/lib/sendPayload";
import { blanksIn, escapeHtml, missingFields, renderTemplate } from "@/lib/template";
import { isEmail } from "@/lib/validate";
import {
  MAX_ATTACHMENTS, MAX_COPY_RECIPIENTS, MAX_FILE_BYTES, MAX_FILES_PER_SEND, MAX_LETTERS_PER_SEND,
  MAX_RECIPIENTS_PER_SEND, MAX_TOTAL_ATTACHMENT_BYTES, MAX_UPLOAD_BYTES_PER_SEND,
} from "@/lib/limits";
import { mergeEmails } from "../RecipientInput";

export const DEFAULT = ""; // variant used by every role that isn't tailored
const EMPTY_VARIANT = { letter: null, files: null, version: 0 };
const BASE_COLUMNS = ["name", "company", "role"];
export const roleKeyOf = (role) => String(role ?? "").trim().toLowerCase();
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

// Email clients don't have the editor's CSS: inline what the letter relies on.
// Quill marks bullet items with data-list on <li> inside an <ol>, and its
// paragraphs have no margins (blank lines are empty paragraphs).
const wrapLetter = (html) => {
  const body = html
    .replace(/<p(\s[^>]*)?>/g, (tag, attrs = "") =>
      attrs.includes('style="') ? tag.replace('style="', 'style="margin: 0; ') : `<p${attrs} style="margin: 0;">`
    )
    .replace(/<li data-list="bullet"/g, '<li data-list="bullet" style="list-style-type: disc;"');
  return `<div style="font-family: sans-serif; line-height: 1.6;">${body}</div>`;
};

/**
 * All state and rules for composing a send: recipients and their fields,
 * letters and files (optionally tailored per role), checks, preview and send.
 * The step components only render this model.
 */
export function useCompose({ active, profile, toast }) {
  const [step, setStep] = useState(1);
  const [emails, setEmails] = useState([]);
  const [fieldsByEmail, setFieldsByEmail] = useState({}); // lowercase email -> imported/typed fields
  // CC/BCC belong to individual emails (set per company in Review, or from
  // CC/BCC sheet columns). The only global copy is "send me a copy".
  const [copies, setCopies] = useState({}); // lowercase email -> { cc: [], bcc: [] }
  const [copyMe, setCopyMe] = useState(false);
  const [subject, setSubject] = useState("");
  // variants[""] is the default; variants[roleKey] overrides letter and/or
  // files for one role (null = use the default).
  const [variants, setVariants] = useState({ [DEFAULT]: { letter: { html: "", text: "" }, files: [], version: 0 } });
  const [tailoring, setTailoring] = useState(false);
  const [activeRole, setActiveRole] = useState(DEFAULT);
  const [library, setLibrary] = useState({ files: [], letters: [] });
  const [busyFile, setBusyFile] = useState(null); // doc id being loaded, or "upload"
  const [previewEmail, setPreviewEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const autoAttached = useRef(false);
  const [autoAttachedName, setAutoAttachedName] = useState(null);

  // ---- Variants ---------------------------------------------------------
  const updateVariant = (key, patch) =>
    setVariants((all) => ({ ...all, [key]: { ...(all[key] ?? EMPTY_VARIANT), ...patch } }));

  const setLetterFor = (key, html, { remount = false } = {}) =>
    setVariants((all) => {
      const variant = all[key] ?? EMPTY_VARIANT;
      return {
        ...all,
        [key]: { ...variant, letter: { html, text: htmlToText(html) }, version: variant.version + (remount ? 1 : 0) },
      };
    });

  const setFilesFor = (key, update) =>
    setVariants((all) => {
      const variant = all[key] ?? EMPTY_VARIANT;
      return { ...all, [key]: { ...variant, files: update(variant.files ?? all[DEFAULT].files) } };
    });

  const fetchAttachment = async (doc) => {
    const full = await apiFetch(`/api/documents/${doc._id}`);
    return { id: doc._id, docId: doc._id, name: full.name, base64: full.content, size: base64Size(full.content) };
  };

  // ---- Saved documents ----------------------------------------------------
  const loadLibrary = useCallback(async () => {
    try {
      const docs = await apiFetch("/api/documents");
      const files = docs.filter((d) => d.type === "file");
      setLibrary({ files, letters: docs.filter((d) => d.type === "coverLetter") });
      // First visit: pre-attach the resume when it's clear which file that is.
      const resume = likelyResume(files);
      if (!autoAttached.current && resume) {
        autoAttached.current = true;
        const attachment = await fetchAttachment(resume);
        setFilesFor(DEFAULT, (current) => (current.length ? current : [attachment]));
        setAutoAttachedName(attachment.name); // shown only while it's the attached file
      }
    } catch (err) {
      toast(`Could not load your documents: ${err.message}`, "error");
    }
  }, [toast]);

  useEffect(() => {
    if (active) loadLibrary();
  }, [active, loadLibrary]);

  // ---- Fields -----------------------------------------------------------
  const sender = useMemo(() => senderFields(profile), [profile]);
  const storedFor = (email) => fieldsByEmail[email.toLowerCase()] ?? {};
  /** Recipient fields: typed/imported values win over guesses from the address. */
  const recipientFields = (email) => {
    const stored = Object.fromEntries(Object.entries(storedFor(email)).filter(([, v]) => String(v).trim()));
    return { ...autoFields(email), ...stored, email };
  };
  const renderFieldsFor = (email) => ({ ...recipientFields(email), ...sender });

  const columns = useMemo(() => {
    const imported = Object.values(fieldsByEmail).flatMap(Object.keys);
    return [...new Set([...BASE_COLUMNS, ...imported])].filter((k) => k !== "email" && !k.startsWith("my_"));
  }, [fieldsByEmail]);

  const roles = [];
  for (const email of emails) {
    const role = recipientFields(email).role?.trim();
    if (!role) continue;
    const existing = roles.find((r) => r.key === roleKeyOf(role));
    if (existing) existing.count += 1;
    else roles.push({ key: roleKeyOf(role), label: role, count: 1 });
  }
  const tailoringOn = tailoring && roles.length > 1;
  const editingRole = tailoringOn && roles.some((r) => r.key === activeRole) ? activeRole : DEFAULT;
  const roleLabel = (key) => (key === DEFAULT ? "Default" : roles.find((r) => r.key === key)?.label ?? key);

  const variantOf = (key) => variants[key] ?? EMPTY_VARIANT;
  const isCustomized = (key) =>
    tailoringOn && key !== DEFAULT && (variantOf(key).letter !== null || variantOf(key).files !== null);
  const letterOf = (key) => (isCustomized(key) && variantOf(key).letter) || variants[DEFAULT].letter;
  const filesOf = (key) => (isCustomized(key) && variantOf(key).files) || variants[DEFAULT].files;
  const variantKeyFor = (email) => {
    const key = roleKeyOf(recipientFields(email).role);
    return isCustomized(key) ? key : DEFAULT;
  };
  const letterLabel = (key) => (key === DEFAULT ? (tailoringOn ? "Default letter" : "Your letter") : `${roleLabel(key)} letter`);

  // What the role being edited currently uses, and whether it owns it.
  const current = variantOf(editingRole);
  const letterEditable = editingRole === DEFAULT || current.letter !== null;
  const filesEditable = editingRole === DEFAULT || current.files !== null;
  const letterOwner = letterEditable ? editingRole : DEFAULT;
  const filesOwner = filesEditable ? editingRole : DEFAULT;
  const currentLetter = letterEditable ? current.letter ?? variants[DEFAULT].letter : variants[DEFAULT].letter;
  const currentFiles = (filesEditable ? current.files : null) ?? variants[DEFAULT].files;
  const editorKey = `${letterOwner}:${variantOf(letterOwner).version}`;

  // ---- Checks (each points at the step that fixes it) ----------------------
  const usedKeys = [...new Set(emails.map(variantKeyFor))];
  if (!usedKeys.length) usedKeys.push(DEFAULT);
  const pool = new Map(usedKeys.flatMap((k) => filesOf(k)).map((f) => [f.id, f]));
  const poolBytes = [...pool.values()].reduce((sum, f) => sum + f.size, 0);
  const incomplete = emails.filter((e) => missingFields([subject, letterOf(variantKeyFor(e)).html], renderFieldsFor(e)).length);
  const blanks = blanksIn([subject, ...usedKeys.map((k) => letterOf(k).text)].join("\n"));
  const named = (keys) => keys.map((k) => roleLabel(k).toLowerCase()).join(", ");

  const issues = [];
  if (!emails.length) issues.push({ step: 1, text: "Add at least one recipient" });
  if (emails.length > MAX_RECIPIENTS_PER_SEND) {
    issues.push({ step: 1, text: `Send to at most ${MAX_RECIPIENTS_PER_SEND} people at a time (you have ${emails.length})` });
  }
  if (incomplete.length) {
    issues.push({
      step: 1,
      text: `${plural(incomplete.length, "recipient is", "recipients are")} missing details your letter uses (highlighted in the table)`,
    });
  }
  if (!subject.trim()) issues.push({ step: 2, text: "Write a subject line" });
  const emptyLetters = usedKeys.filter((k) => !letterOf(k).text.trim());
  if (emptyLetters.length) {
    issues.push({ step: 2, text: usedKeys.length > 1 ? `Write the letter for: ${named(emptyLetters)}` : "Write your cover letter" });
  }
  const fileless = usedKeys.filter((k) => filesOf(k).length === 0);
  if (fileless.length) {
    issues.push({ step: 2, text: usedKeys.length > 1 ? `Attach a resume for: ${named(fileless)}` : "Attach your resume" });
  }
  const oversized = usedKeys.filter(
    (k) => filesOf(k).length > MAX_ATTACHMENTS || filesOf(k).reduce((s, f) => s + f.size, 0) > MAX_TOTAL_ATTACHMENT_BYTES
  );
  if (oversized.length) {
    issues.push({ step: 2, text: `Each email can carry ${MAX_ATTACHMENTS} files and ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} at most` });
  }
  if (blanks.length) issues.push({ step: 2, text: `Fill in ${plural(blanks.length, "blank")} like ${blanks[0]}` });
  if (usedKeys.length > MAX_LETTERS_PER_SEND || pool.size > MAX_FILES_PER_SEND || poolBytes > MAX_UPLOAD_BYTES_PER_SEND) {
    issues.push({ step: 2, text: `Too many different letters or files for one send` });
  }
  const copiesFor = (email) => ({ cc: [], bcc: [], ...copies[email.toLowerCase()] });
  const badCopies = emails.filter((email) => {
    const { cc, bcc } = copiesFor(email);
    return [...cc, ...bcc].some((e) => !isEmail(e)) || cc.length > MAX_COPY_RECIPIENTS || bcc.length > MAX_COPY_RECIPIENTS;
  });
  if (badCopies.length) {
    const where = [...new Set(badCopies.map((e) => recipientFields(e).company || e))].slice(0, 3).join(", ");
    issues.push({ step: 3, text: `Check the CC/BCC addresses for ${where} (max ${MAX_COPY_RECIPIENTS} each)` });
  }
  // Mail is sent from the user's own mailbox (optional while a local catcher takes all mail).
  if (profile?.mailbox && !profile.mailbox.connected && !profile.testMode) {
    issues.push({ step: 3, fix: "profile", text: `Connect your email so applications are sent from ${profile.email}` });
  }
  const issuesFor = (n) => issues.filter((i) => i.step === n);

  // ---- Recipients -------------------------------------------------------
  /** Adds every valid address in `text`; reports skipped ones. Returns the count added. */
  const addEmails = (text) => {
    const parts = String(text).split(/[\s,;<>]+/).filter(Boolean);
    const valid = parts.filter(isEmail);
    const invalid = parts.filter((p) => !isEmail(p));
    const before = new Set(emails.map((e) => e.toLowerCase()));
    const fresh = valid.filter((e) => !before.has(e.toLowerCase()));
    setEmails((prev) => mergeEmails(prev, valid));
    if (invalid.length) {
      toast(`Skipped ${plural(invalid.length, "invalid address", "invalid addresses")}: ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "…" : ""}`, "error");
    }
    return fresh.length;
  };

  const importFile = async (file) => {
    try {
      // Loaded on demand: the spreadsheet parser is large.
      const { extractEmailsFromFile } = await import("@/utils/emailUtils");
      const rows = await extractEmailsFromFile(file);
      if (!rows.length) return toast("No email addresses found. Is there a column named Email?", "error");
      setEmails((prev) => mergeEmails(prev, rows.map((r) => r.email)));
      // CC/BCC columns become that email's copies, not letter fields.
      const split = (value) => String(value ?? "").split(/[\s,;]+/).filter(Boolean);
      setFieldsByEmail((prev) => ({
        ...prev,
        ...Object.fromEntries(
          rows.map(({ email, fields: { cc, bcc, ...fields } }) => [email.toLowerCase(), { ...prev[email.toLowerCase()], ...fields }])
        ),
      }));
      setCopies((prev) => ({
        ...prev,
        ...Object.fromEntries(
          rows.filter((r) => r.fields.cc || r.fields.bcc).map((r) => [r.email.toLowerCase(), { cc: split(r.fields.cc), bcc: split(r.fields.bcc) }])
        ),
      }));
      toast(`Added ${plural(rows.length, "recipient")} from ${file.name}`);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const editField = (email, key, value) =>
    setFieldsByEmail((prev) => ({ ...prev, [email.toLowerCase()]: { ...prev[email.toLowerCase()], [key]: value } }));
  const removeEmail = (email) => setEmails((prev) => prev.filter((e) => e !== email));

  /** Sets CC/BCC for every email going to one company group. */
  const setCompanyCopies = (group, { cc, bcc }) =>
    setCopies((prev) => {
      const next = { ...prev };
      for (const { email } of group.recipients) {
        const current = { cc: [], bcc: [], ...prev[email.toLowerCase()] };
        next[email.toLowerCase()] = { cc: cc ?? current.cc, bcc: bcc ?? current.bcc };
      }
      return next;
    });

  // ---- Letter -----------------------------------------------------------
  /** Loads a starter (`html`, `subject`) or saved letter (`content`) into the letter being edited. */
  const loadTemplate = (template) => {
    if (currentLetter.text.trim() && !confirm("Replace your current letter with this template?")) return false;
    setLetterFor(letterOwner, template.html ?? template.content, { remount: true });
    if (template.subject && !subject.trim()) setSubject(template.subject);
    return true;
  };

  const setLetterHtml = (html, text) => updateVariant(letterOwner, { letter: { html, text } });

  /** Replaces each "[blank]" in the edited letter and the subject with the given value. */
  const fillBlanks = (values) => {
    const entries = Object.entries(values).filter(([, v]) => v.trim());
    if (!entries.length) return;
    let html = currentLetter.html;
    let nextSubject = subject;
    for (const [blank, value] of entries) {
      // The editor's HTML escapes &, < and > in text.
      const inHtml = blank.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html = html.split(inHtml).join(escapeHtml(value.trim()));
      nextSubject = nextSubject.split(blank).join(value.trim());
    }
    setLetterFor(letterOwner, html, { remount: true });
    setSubject(nextSubject);
  };

  // ---- Files ------------------------------------------------------------
  /** Uploads PDFs to the library (so they're there next time) and attaches them. */
  const addFiles = async (selected) => {
    const accepted = [];
    for (const file of selected) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast(`${file.name} is not a PDF`, "error");
      } else if (file.size > MAX_FILE_BYTES) {
        toast(`${file.name} is larger than ${formatBytes(MAX_FILE_BYTES)}`, "error");
      } else {
        accepted.push(file);
      }
    }
    if (!accepted.length) return;
    if (currentFiles.length + accepted.length > MAX_ATTACHMENTS) {
      return toast(`An email can carry at most ${MAX_ATTACHMENTS} files`, "error");
    }
    setBusyFile("upload");
    try {
      const items = await Promise.all(
        accepted.map(async (file) => {
          const base64 = await readFileAsBase64(file);
          const doc = await apiFetch("/api/documents", {
            method: "POST",
            body: { type: "file", name: file.name, content: base64 },
          });
          return { id: doc._id, docId: doc._id, name: file.name, size: file.size, base64 };
        })
      );
      setFilesFor(filesOwner, (files) => [...files, ...items.filter((i) => !files.some((f) => f.docId === i.docId))]);
      await loadLibrary();
    } catch (err) {
      toast(`Upload failed: ${err.message}`, "error");
    } finally {
      setBusyFile(null);
    }
  };

  const toggleLibraryFile = async (doc) => {
    setAutoAttachedName(null);
    if (currentFiles.some((f) => f.docId === doc._id)) {
      return setFilesFor(filesOwner, (files) => files.filter((f) => f.docId !== doc._id));
    }
    if (currentFiles.length >= MAX_ATTACHMENTS) {
      return toast(`An email can carry at most ${MAX_ATTACHMENTS} files`, "error");
    }
    setBusyFile(doc._id);
    try {
      const attachment = await fetchAttachment(doc);
      setFilesFor(filesOwner, (files) => [...files, attachment]);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusyFile(null);
    }
  };

  // ---- Per-role tailoring -------------------------------------------------
  /** Edit a role's letter/files; the preview follows to someone in that role. */
  const selectRole = (key) => {
    setActiveRole(key);
    const someone = emails.find((e) => (key === DEFAULT ? variantKeyFor(e) === DEFAULT : roleKeyOf(recipientFields(e).role) === key));
    if (someone) setPreviewEmail(someone);
  };
  const customizeLetter = () => setLetterFor(editingRole, variants[DEFAULT].letter.html, { remount: true });
  const resetLetter = () => updateVariant(editingRole, { letter: null });
  const customizeFiles = () => setFilesFor(editingRole, (files) => [...files]);
  const resetFiles = () => updateVariant(editingRole, { files: null });

  // ---- Preview ----------------------------------------------------------
  const previewTarget = emails.includes(previewEmail) ? previewEmail : emails[0];
  /** What `email` will receive; without a recipient, shows the edited letter with your details filled. */
  const preview = (email = previewTarget) => {
    const key = email ? variantKeyFor(email) : letterOwner;
    const fields = email ? renderFieldsFor(email) : sender;
    const letter = email ? letterOf(key) : currentLetter;
    const render = (text, options) => renderTemplate(text, fields, { ...options, only: !email });
    return {
      email,
      fields,
      letterLabel: letterLabel(key),
      subject: render(subject),
      html: render(letter.html, { html: true }),
      hasLetter: Boolean(letter.text.trim()),
      files: email ? filesOf(key) : currentFiles,
      missing: email ? missingFields([subject, letter.html], fields) : [],
      cc: email ? copiesFor(email).cc : [],
      bcc: [...(email ? copiesFor(email).bcc : []), ...(copyMe ? [sender.my_email] : [])],
    };
  };

  const companies = groupByCompany(
    emails.map((email) => ({ email, fields: recipientFields(email), message: variantKeyFor(email) }))
  ).map((group) => {
    const key = variantKeyFor(group.recipients[0].email);
    const union = (kind) => [...new Set(group.recipients.flatMap((r) => copiesFor(r.email)[kind]))];
    return { ...group, letterLabel: letterLabel(key), files: filesOf(key), cc: union("cc"), bcc: union("bcc") };
  });

  // ---- Send -------------------------------------------------------------
  const send = async () => {
    setSending(true);
    try {
      const body = buildSendBody({
        subject,
        copyMe,
        wrapHtml: wrapLetter,
        variants: Object.fromEntries(usedKeys.map((k) => [k, { html: letterOf(k).html, files: filesOf(k) }])),
        recipients: emails.map((email) => {
          const fields = recipientFields(email);
          delete fields.email;
          return { email, fields, variant: variantKeyFor(email), ...copiesFor(email) };
        }),
      });
      const { results } = await apiFetch("/api/sendEmails", { method: "POST", body });
      const failed = results.filter((r) => r.status === "failed");
      setResult({ sent: results.length - failed.length, failed });
      setEmails(failed.map((r) => r.email)); // keep failures so they can be retried
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  /** After a send: retry failures (keeps everything) or start a fresh batch. */
  const closeResult = ({ fresh }) => {
    if (fresh) {
      setEmails([]);
      setFieldsByEmail({});
      setCopies({});
      setStep(1);
    } else {
      setStep(3);
    }
    setResult(null);
  };

  return {
    step, setStep, issues, issuesFor, ready: issues.length === 0,
    // recipients
    emails, columns, storedFor, recipientFields, addEmails, importFile, editField, removeEmail,
    incompleteFor: (email) => new Set(missingFields([subject, letterOf(variantKeyFor(email)).html], renderFieldsFor(email))),
    companies, copiesFor, setCompanyCopies, copyMe, setCopyMe,
    // letter
    subject, setSubject, sender, library, loadTemplate, setLetterHtml, fillBlanks, editorKey,
    currentLetter, letterEditable, blanksInLetter: blanksIn(`${subject}\n${currentLetter.text}`),
    // files
    currentFiles, filesEditable, addFiles, toggleLibraryFile, busyFile,
    // Only mention the guess while that file is still the one attached.
    autoAttachedName: variants[DEFAULT].files.some((f) => f.name === autoAttachedName) ? autoAttachedName : null,
    // roles
    roles, tailoring: tailoringOn, setTailoring, editingRole, selectRole, roleLabel, isCustomized,
    customizeLetter, resetLetter, customizeFiles, resetFiles, defaultLetter: variants[DEFAULT].letter,
    defaultFiles: variants[DEFAULT].files,
    // preview + send
    preview, previewTarget, setPreviewEmail, send, sending, result, closeResult,
  };
}
