import { describe, expect, test } from "vitest";
import { POST as register } from "@/app/api/register/route";
import { POST as verify } from "@/app/api/verify/route";
import { POST as login } from "@/app/api/login/route";
import { POST as logout } from "@/app/api/logout/route";
import { POST as requestReset } from "@/app/api/password-reset/route";
import { POST as confirmReset } from "@/app/api/password-reset/confirm/route";
import { PUT as changePassword } from "@/app/api/me/password/route";
import { DELETE as deleteAccount, GET as getProfile } from "@/app/api/me/route";
import { verifyToken } from "@/lib/auth";
import Application from "@/models/Application";
import Document from "@/models/Document";
import User from "@/models/User";
import { call, createUser, sentMail, tokenFrom } from "./helpers";

const PASSWORD = "correct horse battery";
const codeFromMail = () => sentMail().at(-1).text.match(/\d{6}/)[0];
const post = (handler, body, extra = {}) => call(handler, { method: "POST", body, ...extra });

describe("registration and verification", () => {
  test("register emails a code; verifying it with the password signs in with an HttpOnly cookie", async () => {
    const reg = await post(register, { email: " New@Example.com ", password: PASSWORD, name: "New Person" });
    expect(reg.status).toBe(200);
    expect(sentMail()).toHaveLength(1);
    expect(sentMail()[0].to).toBe("new@example.com"); // stored lower-cased

    const stored = await User.findOne({ email: "new@example.com" });
    expect(stored.verified).toBe(false);
    expect(stored.verificationCodeHash).not.toContain(codeFromMail()); // stored hashed

    const res = await post(verify, { email: "new@example.com", code: codeFromMail(), password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ authenticated: true, email: "new@example.com" }); // no token in the body
    expect(res.cookie).toMatch(/HttpOnly/);
    expect(res.cookie).toMatch(/SameSite=Lax/);
    const payload = await verifyToken(tokenFrom(res.cookie));
    expect(payload.sub).toBe(stored._id.toString());
  });

  test("weak passwords and invalid emails are refused", async () => {
    for (const body of [
      { email: "x@example.com", password: "short" },
      { email: "x@example.com", password: "password123" }, // common
      { email: "jonathan@example.com", password: "jonathan2024!" }, // contains the email name
      { email: "x@example.com", password: "a".repeat(30) + "é".repeat(30) }, // over 72 bytes
      { email: "not-an-email", password: PASSWORD },
    ]) {
      expect((await post(register, body)).status, JSON.stringify(body)).toBe(400);
    }
  });

  test("a second sign-up within a minute sends no second code, and says nothing about it", async () => {
    await post(register, { email: "new@example.com", password: PASSWORD });
    expect((await post(register, { email: "new@example.com", password: PASSWORD })).json).toEqual({ ok: true });
    expect(sentMail()).toHaveLength(1);
  });

  test("verification attempts are capped at 5, even with the right code after", async () => {
    await post(register, { email: "new@example.com", password: PASSWORD });
    const code = codeFromMail();
    for (let i = 0; i < 5; i++) {
      expect((await post(verify, { email: "new@example.com", code: "000000", password: PASSWORD })).status).toBe(400);
    }
    expect((await post(verify, { email: "new@example.com", code, password: PASSWORD })).status).toBe(400);
  });

  test("someone re-registering an unverified address can't take over the account", async () => {
    await post(register, { email: "victim@example.com", password: PASSWORD });
    await User.updateOne({ email: "victim@example.com" }, { verificationCodeSentAt: null }); // skip the cooldown
    await post(register, { email: "victim@example.com", password: "attacker password 1" });

    // The real owner enters the code from their inbox with their own password: refused, not signed in.
    const res = await post(verify, { email: "victim@example.com", code: codeFromMail(), password: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.cookie).toBeNull();
    expect((await User.findOne({ email: "victim@example.com" })).verified).toBe(false);
  });

  test("the 'you already have an account' email goes out at most once a day", async () => {
    await createUser({ email: "jane@example.com" });
    for (let i = 0; i < 4; i++) await post(register, { email: "jane@example.com", password: PASSWORD });
    expect(sentMail()).toHaveLength(1);
    // ...and doesn't use up the owner's code allowance.
    await post(requestReset, { email: "jane@example.com" });
    expect(sentMail().at(-1).subject).toMatch(/reset/i);
  });

  test("signing up with a registered address looks the same as a new sign-up, and tells the owner", async () => {
    await createUser({ email: "jane@example.com" });
    const res = await post(register, { email: "jane@example.com", password: PASSWORD });
    expect(res).toMatchObject({ status: 200, json: { ok: true } });
    expect(sentMail()[0].subject).toMatch(/already have/);
    expect(sentMail()[0].text).not.toMatch(/\d{6}/);
  });
});

describe("login", () => {
  test("unknown email and wrong password get the same answer", async () => {
    await createUser({ email: "jane@example.com" });
    const unknown = await post(login, { email: "nobody@example.com", password: "password123" });
    const wrong = await post(login, { email: "jane@example.com", password: "nope" });
    expect(unknown).toEqual(wrong);
    expect(wrong.status).toBe(401);
  });

  test("correct password sets the session cookie; the email's case doesn't matter", async () => {
    const user = await createUser({ email: "Jane@Example.com" }); // an older, mixed-case account
    const res = await post(login, { email: "jane@EXAMPLE.com", password: "password123" });
    expect(res.status).toBe(200);
    expect((await verifyToken(tokenFrom(res.cookie))).sub).toBe(user._id.toString());
  });

  test("locks an address for 15 minutes after 5 failures, the same way whether or not it has an account", async () => {
    await createUser({ email: "jane@example.com" });
    for (const email of ["jane@example.com", "nobody@example.com"]) {
      for (let i = 0; i < 5; i++) await post(login, { email, password: "nope" });
    }
    const real = await post(login, { email: "Jane@example.com", password: "password123" }); // even the right password
    const unknown = await post(login, { email: "nobody@example.com", password: "password123" });
    expect(real).toEqual(unknown);
    expect(real.status).toBe(429);
  });

  test("parallel guesses can't get past the limit", async () => {
    await createUser({ email: "jane@example.com" });
    const results = await Promise.all(
      Array.from({ length: 12 }, () => post(login, { email: "jane@example.com", password: "nope" }, { ip: "203.0.113.5" }))
    );
    expect(results.filter((r) => r.status === 401)).toHaveLength(5);
    expect(results.filter((r) => r.status === 429)).toHaveLength(7);
  }, 30_000);

  test("a lockout from one IP doesn't lock the owner out from theirs", async () => {
    await createUser({ email: "jane@example.com" });
    for (let i = 0; i < 6; i++) await post(login, { email: "jane@example.com", password: "nope" }, { ip: "203.0.113.66" });
    expect((await post(login, { email: "jane@example.com", password: "password123" }, { ip: "203.0.113.66" })).status).toBe(429);
    expect((await post(login, { email: "jane@example.com", password: "password123" }, { ip: "198.51.100.1" })).status).toBe(200);
  });

  test("a password reset lifts the lockout", async () => {
    await createUser({ email: "jane@example.com" });
    for (let i = 0; i < 5; i++) await post(login, { email: "jane@example.com", password: "nope" });
    await post(requestReset, { email: "jane@example.com" });
    await post(confirmReset, { email: "jane@example.com", code: codeFromMail(), password: PASSWORD });
    expect((await post(login, { email: "jane@example.com", password: PASSWORD })).status).toBe(200);
  });

  test("limits attempts per IP address across accounts", async () => {
    for (let i = 0; i < 20; i++) {
      expect((await post(login, { email: `user${i}@example.com`, password: "x" }, { ip: "198.51.100.7" })).status).toBe(401);
    }
    expect((await post(login, { email: "another@example.com", password: "x" }, { ip: "198.51.100.7" })).status).toBe(429);
    expect((await post(login, { email: "another@example.com", password: "x" }, { ip: "198.51.100.8" })).status).toBe(401);
  }, 30_000); // each attempt runs bcrypt at full cost

  test("unverified users are sent a fresh code instead of a session", async () => {
    await createUser({ email: "jane@example.com", verified: false });
    const res = await post(login, { email: "jane@example.com", password: "password123" });
    expect(res.json).toEqual({ needsVerification: true });
    expect(res.cookie).toBeNull();
    expect(sentMail()).toHaveLength(1);
  });

  test("logout clears the cookie and ends the session on the server", async () => {
    const user = await createUser({ email: "jane@example.com" });
    const session = (await post(login, { email: "jane@example.com", password: "password123" })).cookie.split(";")[0];
    const res = await logout(new Request("http://localhost/api/logout", { method: "POST", headers: { cookie: session } }));
    expect(res.headers.get("set-cookie")).toMatch(/^session=;.*Max-Age=0/);
    // The old cookie no longer works, even if someone kept a copy.
    expect((await getProfile(new Request("http://localhost/api/me", { headers: { cookie: session } }))).status).toBe(401);
    expect((await post(logout)).cookie).toMatch(/Max-Age=0/); // works signed out too
    void user;
  });
});

describe("password reset", () => {
  test("a reset code sets a new password, signs in, and ends other sessions", async () => {
    const user = await createUser({ email: "jane@example.com" });
    expect((await post(requestReset, { email: "JANE@example.com" })).json).toEqual({ ok: true });
    expect(sentMail()[0].subject).toMatch(/reset/i);

    const weak = await post(confirmReset, { email: "jane@example.com", code: codeFromMail(), password: "12345678" });
    expect(weak.status).toBe(400);
    const res = await post(confirmReset, { email: "jane@example.com", code: codeFromMail(), password: PASSWORD });
    expect(res.status).toBe(200);
    expect(tokenFrom(res.cookie)).toBeTruthy();

    // Old sessions (version 0) no longer work; the new password does.
    expect((await call(getProfile, { userId: user._id, sessionVersion: 0 })).status).toBe(401);
    expect((await post(login, { email: "jane@example.com", password: PASSWORD })).status).toBe(200);
  });

  test("answers the same for unknown addresses and sends nothing", async () => {
    expect((await post(requestReset, { email: "nobody@example.com" })).json).toEqual({ ok: true });
    expect(sentMail()).toHaveLength(0);
  });

  test("a wrong code doesn't change the password", async () => {
    await createUser({ email: "jane@example.com" });
    await post(requestReset, { email: "jane@example.com" });
    expect((await post(confirmReset, { email: "jane@example.com", code: "000000", password: PASSWORD })).status).toBe(400);
    expect((await post(login, { email: "jane@example.com", password: "password123" })).status).toBe(200);
  });
});

describe("routes check the session themselves", () => {
  test("identity headers or a forged cookie get nothing, even if middleware were skipped", async () => {
    const user = await createUser({ email: "jane@example.com" });
    const asHeaders = new Request("http://localhost/api/me", { headers: { "x-user-id": user._id.toString(), "x-session-version": "0" } });
    expect((await getProfile(asHeaders)).status).toBe(401);
    const forged = new Request("http://localhost/api/me", { headers: { cookie: `session=${"a".repeat(20)}.${"b".repeat(20)}.c` } });
    expect((await getProfile(forged)).status).toBe(401);
    expect((await call(getProfile, { userId: user._id })).status).toBe(200);
  });
});

describe("account settings", () => {
  test("changing the password needs the current one and ends other sessions", async () => {
    const user = await createUser({ email: "jane@example.com" });
    const wrong = await call(changePassword, { method: "PUT", userId: user._id, body: { currentPassword: "nope", newPassword: PASSWORD } });
    expect(wrong.status).toBe(400);

    const res = await call(changePassword, { method: "PUT", userId: user._id, body: { currentPassword: "password123", newPassword: PASSWORD } });
    expect(res.status).toBe(200);
    expect((await verifyToken(tokenFrom(res.cookie))).sv).toBe(1); // this device stays signed in
    expect((await call(getProfile, { userId: user._id, sessionVersion: 0 })).status).toBe(401);
  });

  test("deleting the account needs the password and removes all its data", async () => {
    const user = await createUser({ email: "jane@example.com" });
    const other = await createUser({ email: "other@example.com" });
    for (const owner of [user, other]) {
      await Document.create({ userId: owner._id.toString(), type: "coverLetter", name: "x", content: "<p>x</p>" });
      await Application.create({ userId: owner._id.toString(), subject: "s", coverLetter: "c", recipients: [] });
    }

    expect((await call(deleteAccount, { method: "DELETE", userId: user._id, body: { password: "nope" } })).status).toBe(400);
    const res = await call(deleteAccount, { method: "DELETE", userId: user._id, body: { password: "password123" } });
    expect(res.status).toBe(200);
    expect(res.cookie).toMatch(/Max-Age=0/);

    expect(await User.exists({ _id: user._id })).toBeNull();
    expect(await Document.countDocuments({ userId: user._id.toString() })).toBe(0);
    expect(await Application.countDocuments({ userId: user._id.toString() })).toBe(0);
    expect(await Document.countDocuments({ userId: other._id.toString() })).toBe(1); // others untouched
    expect((await call(getProfile, { userId: user._id, sessionVersion: 0 })).status).toBe(401);
  });
});
