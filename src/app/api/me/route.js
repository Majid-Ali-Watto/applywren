import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Application from "@/models/Application";
import Document from "@/models/Document";
import { checkPassword, currentUserId, signedOut } from "@/lib/accounts";
import { rateLimit } from "@/lib/rateLimit";
import { readJson, errorResponse } from "@/lib/http";
import { assert } from "@/lib/validate";
import { PROFILE_FIELDS, profileJson } from "@/lib/profile";

/** The signed-in user's profile, used for {{my_*}} placeholders. */
export async function GET(req) {
  try {
    await connectDB();
    const user = await User.findById(await currentUserId(req)).select(PROFILE_FIELDS).lean();
    if (!user) return Response.json({ error: "Account not found" }, { status: 404 });
    return Response.json(await profileJson(user));
  } catch (error) {
    return errorResponse(error, "Profile GET");
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const body = await readJson(req);
    const { name = "", phone = "" } = body;
    for (const value of [name, phone, body.link ?? ""]) assert(typeof value === "string", "Invalid profile");
    // "linkedin.com/in/you" is what people type; store it as a full URL.
    const rawLink = (body.link ?? "").trim();
    const link = rawLink && !/^[a-z][a-z0-9+.-]*:/i.test(rawLink) ? `https://${rawLink}` : rawLink;
    assert(name.trim().length <= 100, "Name is too long");
    assert(/^[0-9+()\-.\s]{0,40}$/.test(phone.trim()), "Phone can contain digits, spaces and + ( ) - . only");
    assert(
      link.trim() === "" || (link.trim().length <= 200 && /^https?:\/\/\S+$/i.test(link.trim())),
      "Link must start with http:// or https://"
    );

    const user = await User.findByIdAndUpdate(
      await currentUserId(req),
      { name: name.trim(), phone: phone.trim(), link },
      { new: true, projection: PROFILE_FIELDS }
    ).lean();
    if (!user) return Response.json({ error: "Account not found" }, { status: 404 });
    return Response.json(await profileJson(user));
  } catch (error) {
    return errorResponse(error, "Profile PUT");
  }
}

/** Deletes the account and everything in it (documents, applications). Needs the password. */
export async function DELETE(req) {
  try {
    await connectDB();
    const userId = await currentUserId(req);
    await rateLimit("passwordCheck", userId);
    const { password } = await readJson(req);
    const user = await User.findById(userId);
    assert(await checkPassword(password, user), "Your password is wrong");

    await Promise.all([Document.deleteMany({ userId }), Application.deleteMany({ userId })]);
    await User.deleteOne({ _id: userId });
    return signedOut();
  } catch (error) {
    return errorResponse(error, "Account DELETE");
  }
}
