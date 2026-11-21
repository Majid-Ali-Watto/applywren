import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { currentUserId } from "@/lib/accounts";
import { readJson, errorResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { assert } from "@/lib/validate";
import { assertServer, encryptSecret, suggestServer, verifyMailbox } from "@/lib/mailbox";
import { PROFILE_FIELDS, profileJson } from "@/lib/profile";

/**
 * Connects the user's own mailbox: signs in with the app password first and
 * saves it (encrypted) only if that works. Server settings default to the
 * provider's, so usually only `password` is sent.
 */
export async function PUT(req) {
  try {
    await connectDB();
    const userId = await currentUserId(req);
    // Each attempt signs in to a mail server; don't let this be used to guess app passwords.
    await rateLimit("mailboxConnect", userId, "Too many connection attempts. Try again in an hour.");
    const body = await readJson(req);
    const user = await User.findById(userId).select("email");
    if (!user) return Response.json({ error: "Account not found" }, { status: 404 });

    const password = typeof body.password === "string" ? body.password.trim() : "";
    assert(password.length > 0 && password.length <= 200, "Paste your app password");
    const suggested = body.host ? null : await suggestServer(user.email);
    const host = String(body.host ?? suggested?.host ?? "").trim().toLowerCase();
    const port = Number(body.port ?? suggested?.port);
    assert(host, "Enter your mail server's settings");
    assertServer({ host, port });

    await verifyMailbox({ host, port, email: user.email, password });

    const saved = await User.findByIdAndUpdate(
      user._id,
      { mailbox: { host, port, passwordEncrypted: encryptSecret(password), connectedAt: new Date() } },
      { new: true, projection: PROFILE_FIELDS }
    ).lean();
    return Response.json(await profileJson(saved));
  } catch (error) {
    return errorResponse(error, "Mailbox PUT");
  }
}

/** Disconnects the mailbox and forgets the app password. */
export async function DELETE(req) {
  try {
    await connectDB();
    const user = await User.findByIdAndUpdate(await currentUserId(req), { $unset: { mailbox: 1 } }, { new: true, projection: PROFILE_FIELDS }).lean();
    if (!user) return Response.json({ error: "Account not found" }, { status: 404 });
    return Response.json(await profileJson(user));
  } catch (error) {
    return errorResponse(error, "Mailbox DELETE");
  }
}
