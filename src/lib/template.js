// {{placeholder}} personalization shared by the editor preview and the sender.
// `{{name|Hiring Manager}}` falls back to "Hiring Manager" when a recipient has
// no name; placeholders without a fallback are required.
// Written so matching stays linear on any input: no two adjacent parts can
// match the same characters (an earlier version took minutes on "{{" followed
// by thousands of spaces). The fallback is trimmed in code, not in the regex.
const PLACEHOLDER = /\{\{[ \t]*([A-Za-z0-9_]+(?:[ \t]+[A-Za-z0-9_]+)*)[ \t]*(?:\|([^{}]*))?\}\}/g;

/** The field's own value; keys like "constructor" never reach Object.prototype. */
const valueOf = (fields, key) => (Object.hasOwn(fields, key) ? fields[key] : undefined);

// Text the author must replace, e.g. "[your key skill]" in a starter template.
const BLANK = /\[[^\][\n]{2,80}\]/g;

/** "Company Name" -> "company_name"; "E-mail" -> "email". */
export function normalizeKey(key) {
  return String(key)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Keys of the placeholders in `text` that have no fallback. */
export function placeholdersIn(text) {
  return [
    ...new Set(
      [...String(text).matchAll(PLACEHOLDER)].filter((m) => m[2] === undefined).map((m) => normalizeKey(m[1]))
    ),
  ];
}

/** Required placeholders used in any of `templates` that `fields` has no value for. */
export function missingFields(templates, fields) {
  const keys = new Set(templates.flatMap(placeholdersIn));
  return [...keys].filter((key) => !String(valueOf(fields, key) ?? "").trim());
}

/** Unreplaced "[bracketed]" blanks left in `text`. */
export function blanksIn(text) {
  return [...new Set(String(text).match(BLANK) ?? [])];
}

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Replaces placeholders with field values (or their fallback). Values are
 * HTML-escaped for HTML templates and stripped of line breaks for plain text
 * (e.g. email subjects). Fallbacks are part of the template, so stay as written.
 * With `only`, placeholders whose key is not in `fields` are left untouched.
 */
export function renderTemplate(text, fields, { html = false, only = false } = {}) {
  return String(text).replace(PLACEHOLDER, (match, key, fallback) => {
    if (only && !Object.hasOwn(fields, normalizeKey(key))) return match;
    const value = String(valueOf(fields, normalizeKey(key)) ?? "").trim();
    if (!value) return fallback?.trim() ?? "";
    return html ? escapeHtml(value) : value.replace(/[\r\n]+/g, " ");
  });
}
