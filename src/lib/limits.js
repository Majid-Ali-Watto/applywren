// Limits enforced by the API and mirrored in the UI for early feedback.
export const MAX_RECIPIENTS_PER_SEND = 25;
export const DAILY_RECIPIENT_LIMIT = 100;
export const MAX_COPY_RECIPIENTS = 10; // per CC / BCC list
export const MAX_ATTACHMENTS = 5; // per email
export const MAX_LETTERS_PER_SEND = 10; // distinct letters, e.g. one per role
export const MAX_FILES_PER_SEND = 10; // distinct files across all letters
export const MAX_UPLOAD_BYTES_PER_SEND = 30 * 1024 * 1024;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
// What one account can keep in Documents.
export const MAX_LIBRARY_FILES = 50;
export const MAX_COVER_LETTERS = 100;
export const MAX_STORAGE_BYTES = 150 * 1024 * 1024; // as stored (base64 files, letter HTML)

// Request bodies: base64 makes files a third larger (30 MB -> 40 MB), plus up
// to 10 letters of 200k characters (up to 3 bytes each).
export const MAX_SEND_BODY_BYTES = 48 * 1024 * 1024;
export const MAX_DOCUMENT_BODY_BYTES = 16 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024; // Gmail caps messages at 25 MB after encoding
