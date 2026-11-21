// Best-effort guesses from email addresses, used to pre-fill personalization
// fields. Users can always override them.

// Shared inboxes: their local part is not a person's name.
const GENERIC_LOCAL_PARTS = new Set([
  "admin", "apply", "applications", "career", "careers", "contact", "hello", "help", "hiring",
  "hr", "info", "job", "jobs", "mail", "no", "noreply", "office", "people", "recruit",
  "recruiter", "recruiting", "recruitment", "reply", "sales", "support", "talent", "team",
]);

// Webmail domains say nothing about the employer.
const FREE_MAIL = new Set([
  "aol", "gmail", "gmx", "googlemail", "hotmail", "icloud", "live", "mail", "me", "msn",
  "outlook", "proton", "protonmail", "yahoo", "yandex", "zoho",
]);

// Second-level suffixes where the company is the third label from the right.
const MULTI_PART_TLDS = new Set([
  "ac.uk", "co.in", "co.jp", "co.nz", "co.uk", "co.za", "com.au", "com.br", "com.pk",
  "com.sg", "com.tr", "org.uk",
]);

const titleCase = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/** "jane.doe@x.com" -> "Jane Doe"; null for generic or ambiguous addresses. */
export function nameFromEmail(email) {
  const local = String(email).split("@")[0].split("+")[0].toLowerCase();
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^[a-z]{2,}$/.test(p)) || parts.some((p) => GENERIC_LOCAL_PARTS.has(p))) {
    return null;
  }
  return parts.map(titleCase).join(" ");
}

/** "hr@careers.big-co.co.uk" -> "Big Co"; null for webmail or odd domains. */
export function companyFromEmail(email) {
  const labels = String(email).split("@")[1]?.toLowerCase().split(".").filter(Boolean) ?? [];
  if (labels.length < 2) return null;
  const suffix = labels.slice(-2).join(".");
  const label = MULTI_PART_TLDS.has(suffix) ? labels[labels.length - 3] : labels[labels.length - 2];
  if (!label || FREE_MAIL.has(label) || !/^[a-z0-9-]+$/.test(label)) return null;
  return label.split("-").filter(Boolean).map(titleCase).join(" ");
}

/** Guessed recipient fields; imported or typed values take precedence. */
export function autoFields(email) {
  const guesses = { name: nameFromEmail(email), company: companyFromEmail(email) };
  return Object.fromEntries(Object.entries(guesses).filter(([, v]) => v));
}

/** {{my_*}} fields describing the sender, from their profile. */
export function senderFields(user) {
  const email = user?.email || "";
  return {
    my_name: user?.name?.trim() || nameFromEmail(email) || email.split("@")[0],
    my_email: email,
    my_phone: user?.phone?.trim() || "",
    my_link: user?.link?.trim() || "",
  };
}

/**
 * The library file to pre-attach: the newest one named like a resume, or the
 * only file. Anything else is ambiguous (portfolio, certificate…), so none.
 * `files` are newest first.
 */
export function likelyResume(files) {
  const looksLikeResume = (name) => /\b(resume|résumé|cv|curriculum)\b/i.test(name.replace(/[_.\-]+/g, " "));
  return files.find((f) => looksLikeResume(f.name)) ?? (files.length === 1 ? files[0] : null);
}
