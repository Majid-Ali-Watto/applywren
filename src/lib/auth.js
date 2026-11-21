// Session tokens. Runs in middleware (edge runtime) too, so no Node or DB imports.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_TTL_SECONDS = 24 * 60 * 60;
const ISSUER = "applywren";
const AUDIENCE = "applywren-session";

// In production the cookie is Secure, and the __Host- prefix makes browsers
// refuse it unless it's Secure, host-only and for the whole site.
const secureCookies = () => process.env.NODE_ENV === "production";
export const sessionCookieName = () => (secureCookies() ? "__Host-session" : "session");

/**
 * A secret from the environment, refusing missing, short or placeholder values
 * (a copied example value would let anyone forge sessions).
 */
export function requireSecret(name) {
  const secret = process.env[name];
  if (!secret || secret.length < 32 || /change-?me|example|secret/i.test(secret)) {
    throw new Error(`${name} must be set to at least 32 random characters (e.g. \`openssl rand -hex 32\`)`);
  }
  return secret;
}

function secretKey() {
  return new TextEncoder().encode(requireSecret("JWT_SECRET"));
}

/** `sv` is the user's session version: bumping it ends every session they have. */
export function signToken(user) {
  return new SignJWT({ sv: user.sessionVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user._id.toString())
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Verifies signature, expiry, issuer and audience; throws on any invalid token. */
export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secretKey(), {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof payload.sub !== "string" || !Number.isInteger(payload.sv)) throw new Error("Malformed token");
  return payload;
}

function cookie(value, maxAge) {
  return [
    `${sessionCookieName()}=${value}`,
    "Path=/",
    "HttpOnly", // never readable by page scripts
    "SameSite=Lax", // not sent with cross-site POSTs
    `Max-Age=${maxAge}`,
    secureCookies() && "Secure",
  ]
    .filter(Boolean)
    .join("; ");
}

export async function sessionCookie(user) {
  return cookie(await signToken(user), SESSION_TTL_SECONDS);
}

export const clearedSessionCookie = () => cookie("", 0);
