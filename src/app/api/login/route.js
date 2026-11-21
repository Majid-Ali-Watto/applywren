import { connectDB } from "@/lib/mongodb";
import { checkPassword, findUserByEmail, signedIn } from "@/lib/accounts";
import { sendCode } from "@/lib/mailer";
import { clearRateLimit, clientIp, countAttempt, LIMITS, rateLimit } from "@/lib/rateLimit";
import { readJson, errorResponse } from "@/lib/http";
import { normalizeEmail } from "@/lib/validate";

const invalidCredentials = () => Response.json({ error: "Invalid email or password" }, { status: 401 });

export async function POST(req) {
  try {
    await connectDB();
    const ip = clientIp(req);
    await rateLimit("login", ip, "Too many sign-in attempts. Try again in 15 minutes.");
    const { email, password } = await readJson(req);
    if (typeof email !== "string" || typeof password !== "string") return invalidCredentials();

    // Every attempt is counted before the password is checked (and the count
    // cleared on success), so parallel guesses can't slip past the limit.
    // 5 per address from one IP locks that IP out of the address; 30 per hour
    // from anywhere slows spread-out guessing. Unknown addresses count the same,
    // so a lockout doesn't reveal that an account exists. A reset lifts both.
    const address = normalizeEmail(email);
    const fromHere = await countAttempt("loginFailures", `${address}|${ip}`);
    const fromAnywhere = await countAttempt("loginFailuresEmail", address);
    if (fromHere > LIMITS.loginFailures.max || fromAnywhere > LIMITS.loginFailuresEmail.max) {
      return Response.json({ error: "Too many failed attempts. Try again later, or reset your password." }, { status: 429 });
    }

    // Always runs bcrypt (against a dummy hash for unknown emails), so timing doesn't reveal accounts.
    const user = await findUserByEmail(address);
    if (!(await checkPassword(password, user)) || !user) return invalidCredentials();
    await Promise.all([clearRateLimit("loginFailures", `${address}|${ip}`), clearRateLimit("loginFailuresEmail", address)]);

    if (!user.verified) {
      // Silently skipped if a code was sent less than a minute ago.
      await sendCode(user, "verify");
      return Response.json({ needsVerification: true });
    }
    return signedIn(user);
  } catch (error) {
    return errorResponse(error, "Login");
  }
}
