import { connectDB } from "@/lib/mongodb";
import { checkPassword, consumeCode, signedIn } from "@/lib/accounts";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { readJson, errorResponse } from "@/lib/http";

const invalidCode = () =>
  Response.json({ error: "Invalid or expired code. Request a new one if needed." }, { status: 400 });

/**
 * Verifies a new account. The password chosen at sign-up is required too, so
 * someone who re-registers the address with their own password can't have the
 * real owner's code verify an account they control.
 */
export async function POST(req) {
  try {
    await connectDB();
    await rateLimit("code", clientIp(req));
    const { email, code, password } = await readJson(req);
    if (typeof email !== "string") return invalidCode();

    const user = await consumeCode(email, code, { unverifiedOnly: true });
    if (!user) return invalidCode();
    if (!(await checkPassword(password, user))) {
      return Response.json(
        { error: "That's not the password this account was created with. Sign up again to set a new one." },
        { status: 400 }
      );
    }

    user.verified = true;
    await user.save();
    return signedIn(user);
  } catch (error) {
    return errorResponse(error, "Verification");
  }
}
