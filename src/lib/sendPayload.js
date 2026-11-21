/**
 * Builds the /api/sendEmails body. Recipients sharing a letter variant share
 * one message, and each file is uploaded once however many letters use it.
 *
 * recipients: [{ email, fields, variant, cc?, bcc? }]   variant = key into `variants`
 * variants:   { [key]: { html, files: [{ id, name, base64 }] } }
 */
export function buildSendBody({ recipients, variants, subject, copyMe = false, wrapHtml = (h) => h }) {
  const attachments = [];
  const fileIndex = new Map();
  const messages = [];
  const messageIndex = new Map();

  const indexOfFile = (file) => {
    if (!fileIndex.has(file.id)) {
      fileIndex.set(file.id, attachments.length);
      attachments.push({ name: file.name, base64: file.base64 });
    }
    return fileIndex.get(file.id);
  };

  const indexOfMessage = (key) => {
    if (!messageIndex.has(key)) {
      const variant = variants[key];
      if (!variant) throw new Error(`Unknown letter variant: ${key}`);
      messageIndex.set(key, messages.length);
      messages.push({ html: wrapHtml(variant.html), attachments: variant.files.map(indexOfFile) });
    }
    return messageIndex.get(key);
  };

  return {
    subject,
    copyMe,
    recipients: recipients.map((r) => ({
      email: r.email,
      fields: r.fields,
      message: indexOfMessage(r.variant),
      cc: r.cc ?? [],
      bcc: r.bcc ?? [],
    })),
    messages,
    attachments,
  };
}
