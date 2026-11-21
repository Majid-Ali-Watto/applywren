// SMTP settings for common email providers, so users only paste an app
// password. Ports: 465 is TLS from the start, 587 upgrades with STARTTLS.

const MICROSOFT_NOTE =
  "Microsoft often blocks app-password sign-in for Outlook and Microsoft 365. If connecting fails, use another email account.";

export const PROVIDERS = {
  google: {
    name: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    help: "https://myaccount.google.com/apppasswords",
  },
  yahoo: {
    name: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: 465,
    help: "https://login.yahoo.com/account/security",
  },
  icloud: {
    name: "iCloud Mail",
    host: "smtp.mail.me.com",
    port: 587,
    help: "https://account.apple.com/account/manage",
  },
  zoho: {
    name: "Zoho Mail",
    host: "smtp.zoho.com",
    port: 465,
    help: "https://accounts.zoho.com/home#security/app_password",
  },
  zohoEu: {
    name: "Zoho Mail",
    host: "smtp.zoho.eu",
    port: 465,
    help: "https://accounts.zoho.eu/home#security/app_password",
  },
  aol: {
    name: "AOL Mail",
    host: "smtp.aol.com",
    port: 465,
    help: "https://login.aol.com/account/security",
  },
  gmx: { name: "GMX", host: "mail.gmx.net", port: 587 },
  fastmail: { name: "Fastmail", host: "smtp.fastmail.com", port: 465 },
  outlook: { name: "Outlook", host: "smtp-mail.outlook.com", port: 587, note: MICROSOFT_NOTE },
  microsoft365: { name: "Microsoft 365", host: "smtp.office365.com", port: 587, note: MICROSOFT_NOTE },
};

const BY_DOMAIN = {
  "gmail.com": "google",
  "googlemail.com": "google",
  "yahoo.com": "yahoo",
  "ymail.com": "yahoo",
  "rocketmail.com": "yahoo",
  "icloud.com": "icloud",
  "me.com": "icloud",
  "mac.com": "icloud",
  "zoho.com": "zoho",
  "zohomail.com": "zoho",
  "zoho.eu": "zohoEu",
  "zohomail.eu": "zohoEu",
  "aol.com": "aol",
  "gmx.com": "gmx",
  "gmx.net": "gmx",
  "gmx.de": "gmx",
  "fastmail.com": "fastmail",
  "outlook.com": "outlook",
  "hotmail.com": "outlook",
  "live.com": "outlook",
  "msn.com": "outlook",
};

// Mail exchanger suffix -> provider, for addresses on a company's own domain.
const BY_MX = [
  [/(^|\.)(google\.com|googlemail\.com)$/, "google"],
  [/(^|\.)mail\.protection\.outlook\.com$/, "microsoft365"],
  [/(^|\.)zoho\.eu$/, "zohoEu"],
  [/(^|\.)zoho\.com$/, "zoho"],
  [/(^|\.)yahoodns\.net$/, "yahoo"],
  [/(^|\.)icloud\.com$/, "icloud"],
  [/(^|\.)messagingengine\.com$/, "fastmail"],
];

export const domainOf = (email) => String(email).split("@").pop().trim().toLowerCase();

/** Provider settings for a well-known address domain, or null. */
export function providerForEmail(email) {
  const key = BY_DOMAIN[domainOf(email)] ?? BY_DOMAIN[domainOf(email).replace(/^yahoo\.[a-z.]+$/, "yahoo.com")];
  return key ? PROVIDERS[key] : null;
}

/** Provider settings for a domain whose mail servers (MX hosts) are known, or null. */
export function providerForMx(mxHosts) {
  for (const host of mxHosts) {
    const name = String(host).toLowerCase().replace(/\.$/, "");
    const match = BY_MX.find(([pattern]) => pattern.test(name));
    if (match) return PROVIDERS[match[1]];
  }
  return null;
}

export const SMTP_PORTS = [465, 587];

/** A hostname like smtp.example.com (no IP addresses, ports or paths). */
export function isSmtpHostname(host) {
  const value = String(host).toLowerCase();
  return (
    value.length <= 253 &&
    /^(?=.*[a-z])([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)
  );
}
