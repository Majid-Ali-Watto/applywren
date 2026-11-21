// Product name and public details shared by page metadata, the share image,
// robots.txt, the sitemap and the web manifest.
export const SITE_NAME = "Applywren";
export const TAGLINE = "Personalized job applications by email";
export const DESCRIPTION =
  "Send every recruiter a personalized cover letter and the right resume from one list, then track each application from pending to offer.";
export const BRAND_COLOR = "#4f46e5";

// Public address of the deployed app, used for absolute URLs in share previews
// and the sitemap. Set SITE_URL in production.
export const SITE_URL = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

// Where people reach you about privacy and the terms (shown on /privacy and
// /terms). Set CONTACT_EMAIL before going live.
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "";
export const LEGAL_UPDATED = "November 21, 2026";
