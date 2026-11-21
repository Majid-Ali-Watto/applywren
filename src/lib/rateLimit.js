// Server-only: fixed-window rate limits stored in MongoDB, so they hold across
// server instances and restarts.
import RateLimit from "@/models/RateLimit";
import { HttpError } from "./validate";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Named limits: `max` requests per `window` milliseconds. */
export const LIMITS = {
  login: { max: 20, window: 15 * MINUTE }, // sign-in attempts per IP
  loginFailures: { max: 5, window: 15 * MINUTE }, // per email + IP: locks out guessing from one place
  loginFailuresEmail: { max: 30, window: HOUR }, // per email from anywhere: slows spread-out guessing
  register: { max: 10, window: HOUR }, // per IP
  code: { max: 30, window: 15 * MINUTE }, // code checks per IP
  resetRequest: { max: 10, window: HOUR }, // per IP
  // Codes emailed to one address. Hourly, so someone requesting codes for
  // another person's address only blocks them for an hour; the daily cap
  // bounds how much mail one address can be sent.
  codesPerEmail: { max: 5, window: HOUR },
  codesPerEmailDaily: { max: 20, window: 24 * HOUR },
  existsNotice: { max: 1, window: 24 * HOUR }, // "you already have an account" emails per address
  passwordCheck: { max: 10, window: HOUR }, // per user: change password, delete account
  mailboxConnect: { max: 10, window: HOUR }, // per user: sign-ins to their mail server
};

/**
 * The client's IP as reported by the reverse proxy in front of the app. Uses
 * X-Real-IP (set by Vercel, and by nginx with `proxy_set_header X-Real-IP`),
 * otherwise the last X-Forwarded-For entry: the one our own proxy appended
 * (earlier entries come from the client and can be forged). Without a proxy
 * every client shares one bucket, so always deploy behind one.
 */
export function clientIp(req) {
  const real = req.headers.get("x-real-ip")?.trim();
  const forwarded = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
  return real || forwarded || "unknown";
}

// Fixed windows: one counter document per key and window, so counting is a
// single atomic upsert and parallel requests can't all start a "new" window.
function bucket(name, subject) {
  const { window } = LIMITS[name];
  const index = Math.floor(Date.now() / window);
  return { key: `${name}:${subject}:${index}`, expiresAt: new Date((index + 1) * window) };
}

/** Adds one to the current window's count and returns the new count. */
export async function countAttempt(name, subject) {
  const { key, expiresAt } = bucket(name, subject);
  const update = () =>
    RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, new: true });
  try {
    return (await update()).count;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return (await update()).count; // two requests created the window at once; the other one won
  }
}

/** Counts one request against `name` for `subject`; throws a 429 once over the limit. */
export async function rateLimit(name, subject, message = "Too many attempts. Please wait a while and try again.") {
  if ((await countAttempt(name, subject)) > LIMITS[name].max) throw new HttpError(429, message);
}

export async function clearRateLimit(name, subject) {
  await RateLimit.deleteOne({ key: bucket(name, subject).key });
}
