import bcrypt from "bcryptjs";
import User from "@/models/User";
import { encryptSecret } from "@/lib/mailbox";
import { signToken } from "@/lib/auth";

const PDF_HEADER = "%PDF-1.4\n";

/** A small valid-looking PDF as base64; `label` makes the bytes (and hash) unique. */
export const pdf = (label = "resume") => Buffer.from(`${PDF_HEADER}% ${label}\n%%EOF\n`).toString("base64");

export async function createUser({ email = "jane.doe@example.com", password = "password123", verified = true, ...rest } = {}) {
  return User.create({ email, password: await bcrypt.hash(password, 4), verified, ...rest });
}

/** A connected Gmail mailbox, as stored on a user. */
export const gmailMailbox = (password = "app-password") => ({
  host: "smtp.gmail.com",
  port: 465,
  passwordEncrypted: encryptSecret(password),
  connectedAt: new Date(),
});

/**
 * Calls a route handler the way a signed-in browser would: `userId` becomes a
 * real session cookie for that user, with their current session version unless
 * `sessionVersion` is given. Returns the status, parsed JSON and any Set-Cookie.
 */
export async function call(handler, { method = "GET", url = "http://localhost/api", body, userId, sessionVersion, params, ip } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (userId) {
    const version = sessionVersion ?? (await User.findById(userId).select("sessionVersion").lean())?.sessionVersion ?? 0;
    headers.set("cookie", `session=${await signToken({ _id: userId, sessionVersion: version })}`);
  }
  if (ip) headers.set("x-real-ip", ip);
  const request = new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const response = await handler(request, { params: Promise.resolve(params ?? {}) });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null, cookie: response.headers.get("set-cookie") };
}

/** The session token inside a Set-Cookie header, or null. */
export const tokenFrom = (cookie) => /(?:^|\s)session=([^;]*)/.exec(cookie ?? "")?.[1] || null;

export const sentMail = () => globalThis.sentMail;
