import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    // Check if user exists
    let user = await User.findOne({ email });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      // If user exists but not verified, update verification code
      if (!user.verified) {
        user.verificationCode = code;
        user.verificationCodeExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ); // 24 hours
        await user.save();
      } else {
        return new Response(
          JSON.stringify({ error: "Email already registered and verified" }),
          { status: 400 }
        );
      }
    } else {
      // Create new user
      user = await User.create({
        email,
        password: hashedPassword,
        verified: false,
        verificationCode: code,
        verificationCodeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    // Send verification email
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.FROM,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.FROM,
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${code}`,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(JSON.stringify({ error: "Registration failed" }), {
      status: 500,
    });
  }
}
