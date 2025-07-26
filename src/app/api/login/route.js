import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "@/utils/jwt";

export async function POST(req) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    const user = await User.findOne({ email });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
      });
    }

    if (!user.verified) {
      // Generate new verification code and send email
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = code;
      user.verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      // Send new verification email...
      return new Response(JSON.stringify({ needsVerification: true }), {
        status: 200,
      });
    }

    const token = generateToken(user);

    return new Response(
      JSON.stringify({
        authenticated: true,
        email: user.email,
        userId: user._id.toString(), // Add this line
        token,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Login failed" }), {
      status: 500,
    });
  }
}
