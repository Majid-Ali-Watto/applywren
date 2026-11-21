import DOMPurify from "dompurify";

/** Sanitizes stored or user-supplied HTML before it is inserted into the DOM. */
export function safeHtml(html) {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(String(html ?? ""));
}
