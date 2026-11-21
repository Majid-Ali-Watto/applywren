import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { sessionTokenOf, signedOut } from "@/lib/accounts";
import { verifyToken } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

/**
 * Signs out: ends the session on the server too (by bumping the session
 * version, which signs out every device), so a copied cookie stops working.
 * Always clears the cookie, even when the session has already expired.
 */
export async function POST(req) {
  try {
    const session = await verifyToken(sessionTokenOf(req)).catch(() => null);
    if (session) {
      await connectDB();
      await User.updateOne({ _id: session.sub, sessionVersion: session.sv }, { $inc: { sessionVersion: 1 } });
    }
    return signedOut();
  } catch (error) {
    return errorResponse(error, "Logout");
  }
}
