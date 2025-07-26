import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();
    const { email, code } = await req.json();

    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: new Date() },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ verified: false, error: "Invalid or expired code" }),
        { status: 400 }
      );
    }

    // Mark as verified and clear verification code
    user.verified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    return new Response(JSON.stringify({ verified: true, email: user.email }), {
      status: 200,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500,
    });
  }
}
