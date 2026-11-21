import { connectDB } from "@/lib/mongodb";
import { consumeCode, hashPassword, signedIn } from "@/lib/accounts";
import { clearRateLimit, clientIp, rateLimit } from "@/lib/rateLimit";
import { readJson, errorResponse } from "@/lib/http";
import { assert, passwordProblem } from "@/lib/validate";

/** Sets a new password with an emailed code, ends all other sessions and signs in. */
export async function POST(req) {
  try {
    await connectDB();
    const ip = clientIp(req);
    await rateLimit("code", ip);
    const { email, code, password } = await readJson(req);
    const problem = passwordProblem(password, email);
    assert(!problem, problem);

    const user = await consumeCode(email, code);
    if (!user) return Response.json({ error: "Invalid or expired code. Request a new one if needed." }, { status: 400 });

    user.password = await hashPassword(password);
    user.verified = true; // the code proves they own the address
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await user.save();
    // A reset lifts sign-in lockouts for this address.
    await Promise.all([clearRateLimit("loginFailures", `${user.email}|${ip}`), clearRateLimit("loginFailuresEmail", user.email)]);
    return signedIn(user);
  } catch (error) {
    return errorResponse(error, "Password reset");
  }
}
