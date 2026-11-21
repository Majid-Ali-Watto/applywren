import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { countAttempt, LIMITS, rateLimit } from "./rateLimit";
import { requireSecret } from "./auth";

const CODE_TTL_MS = 30 * 60 * 1000;
const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

let transporter;

// The app's own account, used for verification and password-reset codes.
// SMTP_HOST points at a local mail catcher (see docker-compose.yml) for
// development; without it mail goes out through Gmail.
export function getTransporter() {
  transporter ??= nodemailer.createTransport(
    process.env.SMTP_HOST
      ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 1025), pool: true }
      : {
          service: "Gmail",
          pool: true,
          auth: { user: process.env.FROM, pass: process.env.GMAIL_PASS },
        }
  );
  return transporter;
}

/** Keyed hash of a one-time code, so a database copy alone can't reverse it. */
export function hashCode(code) {
  return crypto.createHmac("sha256", `${requireSecret("JWT_SECRET")}:one-time-codes`).update(String(code)).digest("hex");
}

const CODE_MAIL = {
  verify: {
    subject: "Your Applywren verification code",
    text: (code) => `Your verification code is: ${code}\n\nIt expires in 30 minutes. If you didn't create an account, ignore this email.`,
  },
  reset: {
    subject: "Your Applywren password reset code",
    text: (code) =>
      `Your password reset code is: ${code}\n\nIt expires in 30 minutes. If you didn't ask to reset your password, ignore this email; your password stays the same.`,
  },
};

/**
 * Issues a fresh one-time code to `user` (saving it hashed) and emails it.
 * Returns false without sending if a code was sent within the last minute.
 * At most LIMITS.codesPerEmail(Daily) codes go to one address per hour (day).
 */
export async function sendCode(user, purpose = "verify") {
  const sentAt = user.verificationCodeSentAt?.getTime() ?? 0;
  if (Date.now() - sentAt < CODE_RESEND_COOLDOWN_MS) return false;
  const message = "Too many codes were sent to this address. Try again later.";
  await rateLimit("codesPerEmail", user.email, message);
  await rateLimit("codesPerEmailDaily", user.email, message);

  const code = crypto.randomInt(100000, 1000000).toString();
  user.verificationCodeHash = hashCode(code);
  user.verificationCodeExpires = new Date(Date.now() + CODE_TTL_MS);
  user.verificationCodeSentAt = new Date();
  user.verificationAttempts = 0;
  await user.save();

  const mail = CODE_MAIL[purpose];
  await getTransporter().sendMail({ from: process.env.FROM, to: user.email, subject: mail.subject, text: mail.text(code) });
  return true;
}

/** Tells an existing account holder that someone tried to sign up with their address. */
export async function sendAccountExistsNotice(user) {
  // Its own budget (one a day), so repeated sign-up attempts can't use up the
  // owner's code allowance or flood their inbox.
  if ((await countAttempt("existsNotice", user.email)) > LIMITS.existsNotice.max) return;
  await getTransporter().sendMail({
    from: process.env.FROM,
    to: user.email,
    subject: "You already have an Applywren account",
    text:
      "Someone (hopefully you) tried to create an Applywren account with this email address, but you already have one.\n\n" +
      "Sign in instead, or use \"Forgot password?\" to set a new password. If this wasn't you, you can ignore this email.",
  });
}
