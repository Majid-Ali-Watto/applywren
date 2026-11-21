import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { checkPassword, currentUserId, hashPassword, signedIn } from "@/lib/accounts";
import { rateLimit } from "@/lib/rateLimit";
import { readJson, errorResponse } from "@/lib/http";
import { assert, passwordProblem } from "@/lib/validate";

/** Changes the password, signs out every other session and keeps this one. */
export async function PUT(req) {
  try {
    await connectDB();
    const userId = await currentUserId(req);
    await rateLimit("passwordCheck", userId);
    const { currentPassword, newPassword } = await readJson(req);
    const user = await User.findById(userId);
    assert(await checkPassword(currentPassword, user), "Your current password is wrong");
    const problem = passwordProblem(newPassword, user.email);
    assert(!problem, problem);

    user.password = await hashPassword(newPassword);
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await user.save();
    return signedIn(user, { ok: true });
  } catch (error) {
    return errorResponse(error, "Password change");
  }
}
