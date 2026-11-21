import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { findUserByEmail, hashPassword } from "@/lib/accounts";
import { sendAccountExistsNotice, sendCode } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { afterResponse, readJson, errorResponse } from "@/lib/http";
import { assert, isEmail, normalizeEmail, passwordProblem } from "@/lib/validate";

export async function POST(req) {
  try {
    await connectDB();
    await rateLimit("register", clientIp(req), "Too many sign-ups from your network. Try again in an hour.");
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const name = body.name ?? "";
    assert(isEmail(email), "Enter a valid email address");
    const problem = passwordProblem(body.password, email);
    assert(!problem, problem);
    assert(typeof name === "string" && name.trim().length <= 100, "Name is too long");

    // Every path hashes the password and sends its email after responding, and
    // all answer { ok: true }, so neither the answer nor its timing reveals
    // whether the address already has an account.
    const password = await hashPassword(body.password);
    let user = await findUserByEmail(email);
    if (user?.verified) {
      // The owner gets an email saying someone tried to sign up.
      await afterResponse(() => sendAccountExistsNotice(user), "Account-exists notice");
      return Response.json({ ok: true });
    }

    // Unverified: whoever proves they own the address (code + this password) gets it.
    if (user) {
      user.password = password;
      if (name.trim()) user.name = name.trim();
    } else {
      user = new User({ email, password, name: name.trim() });
    }
    await user.save();
    // At most one code a minute; a quicker retry is silently skipped.
    await afterResponse(() => sendCode(user, "verify"), "Verification code");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Registration");
  }
}
