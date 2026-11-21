// Server-only: each user's own mailbox, used to send their applications from
// their address. Credentials are app passwords, stored encrypted.
import crypto from "node:crypto";
import dns from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import nodemailer from "nodemailer";
import { getTransporter } from "./mailer";
import { domainOf, isSmtpHostname, providerForEmail, providerForMx, SMTP_PORTS } from "./mailProviders";
import { ValidationError } from "./validate";
import { requireSecret } from "./auth";

// ---- Encryption (AES-256-GCM, key derived from MAILBOX_SECRET) ---------------

function key() {
  return crypto.createHash("sha256").update(requireSecret("MAILBOX_SECRET")).digest();
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")}`;
}

export function decryptSecret(stored) {
  const raw = Buffer.from(String(stored).replace(/^v1:/, ""), "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

// ---- Only connect to public mail servers -------------------------------------

const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3],
  ["192.0.2.0", 24], ["198.51.100.0", 24], ["203.0.113.0", 24], // documentation ranges
]) PRIVATE.addSubnet(net, prefix, "ipv4");
// Includes NAT64 and 6to4, which can wrap an internal IPv4 address.
for (const [net, prefix] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
  ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["2002::", 16], ["2001:db8::", 32],
]) {
  PRIVATE.addSubnet(net, prefix, "ipv6");
}

/** False for loopback, private, link-local and other non-internet addresses. */
export function isPublicAddress(ip) {
  const family = isIP(ip);
  if (!family) return false;
  const mapped = family === 6 && /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return !PRIVATE.check(mapped[1], "ipv4");
  return !PRIVATE.check(ip, family === 4 ? "ipv4" : "ipv6");
}

/**
 * Resolves the server once and connects to that address (TLS still checks the
 * hostname), so a user-supplied host can't point the app at internal services.
 */
async function publicAddress(host) {
  let addresses = [];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new ValidationError(`Couldn't find the mail server ${host}`);
  }
  const usable = addresses.find((a) => isPublicAddress(a.address));
  if (!usable || addresses.some((a) => !isPublicAddress(a.address))) {
    throw new ValidationError(`${host} isn't a public mail server`);
  }
  return usable.address;
}

// ---- Settings ----------------------------------------------------------------

/** Server settings to suggest for an address: known provider, else from its MX records. */
export async function suggestServer(email) {
  const known = providerForEmail(email);
  if (known) return known;
  try {
    const mx = await dns.resolveMx(domainOf(email));
    return providerForMx(mx.map((r) => r.exchange));
  } catch {
    return null;
  }
}

export function assertServer({ host, port }) {
  if (!isSmtpHostname(host)) throw new ValidationError("Enter the mail server's name, like smtp.example.com");
  if (!SMTP_PORTS.includes(port)) throw new ValidationError(`Port must be ${SMTP_PORTS.join(" or ")}`);
}

async function mailboxTransport({ host, port, email, password }) {
  return nodemailer.createTransport({
    host: await publicAddress(host),
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    tls: { servername: host },
    auth: { user: email, pass: password },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 60_000,
  });
}

export const AUTH_FAILED = "Your email provider rejected the app password. Reconnect your email in your profile.";

/** Signs in to the mailbox without sending anything; throws a ValidationError with the reason. */
export async function verifyMailbox(settings) {
  const transport = await mailboxTransport(settings);
  try {
    await transport.verify();
  } catch (error) {
    if (error?.code === "EAUTH") {
      throw new ValidationError("Your email provider rejected the app password. Check it and try again.");
    }
    throw new ValidationError(`Couldn't connect to ${settings.host}:${settings.port}. Check the server settings.`);
  } finally {
    transport.close();
  }
}

/**
 * The transport for a user's applications, sent from their own address.
 * With SMTP_HOST set (local development), all mail goes to that catcher instead.
 */
export async function senderTransport(user) {
  if (process.env.SMTP_HOST) return { transport: getTransporter(), close() {} };
  const mailbox = user.mailbox;
  if (!mailbox?.host || !mailbox.passwordEncrypted) {
    throw new ValidationError("Connect your email account in your profile, so applications are sent from your address.");
  }
  let password;
  try {
    password = decryptSecret(mailbox.passwordEncrypted);
  } catch (error) {
    // MAILBOX_SECRET changed (or data is corrupt): the stored password is unusable.
    console.error("Mailbox password could not be decrypted:", error);
    throw new ValidationError("Reconnect your email in your profile; its saved app password can't be used anymore.");
  }
  const transport = await mailboxTransport({ host: mailbox.host, port: mailbox.port, email: user.email, password });
  return { transport, close: () => transport.close() };
}
