// Shared by client and server. Rejects characters that could inject headers
// or extra addresses (CR/LF, commas, angle brackets, quotes, ...).
const EMAIL_RE = /^[^\s@<>(),;:"[\]\\]+@[^\s@<>(),;:"[\]\\]+\.[^\s@<>(),;:"[\]\\]{2,}$/;

export function isEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

export function isNonEmptyString(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

/** Throwable validation error that routes translate into a 400 response. */
export class ValidationError extends Error {}

/** An error with a status code and a message that is safe to show the user. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Lower-cased and trimmed, so the same address always finds the same account. */
export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "12345678", "123456789",
  "1234567890", "11111111", "00000000", "87654321", "qwertyui", "qwerty123", "qwertyuiop",
  "iloveyou", "sunshine", "princess", "football", "baseball", "superman", "trustno1",
  "welcome1", "welcome123", "letmein1", "abc12345", "abcd1234", "1q2w3e4r", "1qaz2wsx",
  "zaq12wsx", "admin123", "changeme", "computer", "internet", "starwars", "whatever",
]);

/**
 * Why a new password is unacceptable, or "" if it's fine. bcrypt only uses
 * the first 72 bytes, so longer passwords are refused rather than cut.
 */
export function passwordProblem(password, email = "") {
  if (typeof password !== "string" || password.length < 8) return "Use at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72) return "Use at most 72 characters.";
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(password)) return "That password is too common. Choose another.";
  const name = normalizeEmail(email).split("@")[0];
  if (name.length >= 4 && lower.includes(name)) return "Don't use your email address in your password.";
  return "";
}

export function assert(condition, message) {
  if (!condition) throw new ValidationError(message);
}
