// Server-only: account lookups, passwords, one-time codes and sessions.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { clearedSessionCookie, sessionCookie, sessionCookieName, verifyToken } from "./auth";
import { hashCode, MAX_CODE_ATTEMPTS } from "./mailer";
import { HttpError, normalizeEmail } from "./validate";

export const BCRYPT_COST = 12;
export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST);

// Compared against when an account doesn't exist, so response time doesn't reveal it.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);
export const checkPassword = (password, user) =>
  bcrypt.compare(typeof password === "string" ? password : "", user?.password ?? DUMMY_HASH);

/** Finds an account by email, ignoring case (older accounts may be stored mixed-case). */
export function findUserByEmail(email) {
  return User.findOne({ email: normalizeEmail(email) }).collation({ locale: "en", strength: 2 });
}

/**
 * Checks a one-time code for `email` and clears it when it matches. Every
 * attempt is counted atomically before comparing, so parallel guesses can't
 * exceed MAX_CODE_ATTEMPTS. Returns the user, or null.
 */
export async function consumeCode(email, code, { unverifiedOnly = false } = {}) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return null;
  const user = await User.findOneAndUpdate(
    {
      email: normalizeEmail(email),
      ...(unverifiedOnly && { verified: false }),
      verificationCodeHash: { $ne: null },
      verificationCodeExpires: { $gt: new Date() },
      verificationAttempts: { $lt: MAX_CODE_ATTEMPTS },
    },
    { $inc: { verificationAttempts: 1 } },
    { new: true, collation: { locale: "en", strength: 2 } }
  );
  if (!user) return null;
  const matches = crypto.timingSafeEqual(
    Buffer.from(hashCode(code.trim()), "hex"),
    Buffer.from(user.verificationCodeHash, "hex")
  );
  if (!matches) return null;
  user.verificationCodeHash = null;
  user.verificationCodeExpires = null;
  user.verificationAttempts = 0;
  return user;
}

/** A JSON response that also signs the user in (HttpOnly session cookie). */
export async function signedIn(user, body = {}) {
  return Response.json(
    { authenticated: true, email: user.email, ...body },
    { headers: { "Set-Cookie": await sessionCookie(user) } }
  );
}

export function signedOut(body = { ok: true }) {
  return Response.json(body, { headers: { "Set-Cookie": clearedSessionCookie() } });
}

const checked = new WeakMap(); // request -> user id, so a route can ask more than once

/** The raw session token from the request's Cookie header, or "". */
export function sessionTokenOf(req) {
  const name = sessionCookieName();
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

/**
 * The signed-in user's id. Verifies the session cookie itself (the middleware
 * checks it too, but routes don't rely on that), then that the account still
 * exists and the session hasn't been ended by a password change, reset or
 * sign-out. Throws a 401 otherwise.
 */
export async function currentUserId(req) {
  if (checked.has(req)) return checked.get(req);
  const signedOutError = new HttpError(401, "Please sign in again.");
  const payload = await verifyToken(sessionTokenOf(req)).catch(() => null);
  if (!payload) throw signedOutError;
  const user = await User.findById(payload.sub).select("sessionVersion").lean().catch(() => null);
  if (!user || (user.sessionVersion ?? 0) !== payload.sv) throw signedOutError;
  checked.set(req, payload.sub);
  return payload.sub;
}
