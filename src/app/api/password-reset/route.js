import { connectDB } from "@/lib/mongodb";
import { findUserByEmail } from "@/lib/accounts";
import { sendCode } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { afterResponse, readJson, errorResponse } from "@/lib/http";
import { isEmail, normalizeEmail } from "@/lib/validate";

/** Emails a reset code. Answers the same whether or not the account exists. */
export async function POST(req) {
  try {
    await connectDB();
    await rateLimit("resetRequest", clientIp(req), "Too many reset requests. Try again in an hour.");
    const email = normalizeEmail((await readJson(req)).email);
    if (isEmail(email)) {
      const user = await findUserByEmail(email);
      if (user) await afterResponse(() => sendCode(user, "reset"), "Reset code");
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Password reset");
  }
}
