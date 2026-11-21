import { describe, expect, test } from "vitest";
import { GET as getProfile } from "@/app/api/me/route";
import { DELETE as disconnect, PUT as connect } from "@/app/api/me/mailbox/route";
import User from "@/models/User";
import { decryptSecret } from "@/lib/mailbox";
import { call, createUser, gmailMailbox } from "./helpers";

const connectAs = (user, body) => call(connect, { method: "PUT", userId: user._id, body });
const storedMailbox = async (user) => (await User.findById(user._id).select("+mailbox.passwordEncrypted").lean()).mailbox;

describe("connecting the user's mailbox (/api/me/mailbox)", () => {
  test("suggests the provider's server from the address", async () => {
    const gmail = await createUser({ email: "jane@gmail.com" });
    expect((await call(getProfile, { userId: gmail._id })).json.mailbox).toMatchObject({
      connected: false,
      suggested: { name: "Gmail", host: "smtp.gmail.com", port: 465, help: expect.stringContaining("apppasswords") },
    });
    // A company domain hosted by Google Workspace, found through its MX records.
    const workspace = await createUser({ email: "jane@workspace.test" });
    expect((await call(getProfile, { userId: workspace._id })).json.mailbox.suggested.host).toBe("smtp.gmail.com");
    const unknown = await createUser({ email: "jane@unknown.test" });
    expect((await call(getProfile, { userId: unknown._id })).json.mailbox.suggested).toBeNull();
  });

  test("signs in first, then stores the app password encrypted and never returns it", async () => {
    const user = await createUser({ email: "jane@gmail.com" });
    const res = await connectAs(user, { password: " abcd efgh ijkl mnop " });
    expect(res.status).toBe(200);
    expect(res.json.mailbox).toEqual({ connected: true, host: "smtp.gmail.com", port: 465 });
    expect(JSON.stringify(res.json)).not.toContain("abcd");

    const mailbox = await storedMailbox(user);
    expect(mailbox.passwordEncrypted).not.toContain("abcd");
    expect(decryptSecret(mailbox.passwordEncrypted)).toBe("abcd efgh ijkl mnop");
    expect(JSON.stringify((await call(getProfile, { userId: user._id })).json)).not.toContain("passwordEncrypted");
  });

  test("a rejected app password is reported and not saved", async () => {
    const user = await createUser({ email: "jane@gmail.com" });
    const res = await connectAs(user, { password: "wrong-password" });
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/rejected the app password/);
    expect((await storedMailbox(user))?.host).toBeUndefined();
  });

  test("custom servers must be public hostnames on an SMTP port", async () => {
    const user = await createUser({ email: "jane@company.test" });
    const bad = [
      { password: "x" }, // no known provider and no server given
      { password: "x", host: "mail.internal.test", port: 465 }, // resolves to a private address
      { password: "x", host: "10.0.0.5", port: 465 },
      { password: "x", host: "smtp.company.test", port: 25 },
      { password: "", host: "smtp.company.test", port: 465 },
    ];
    for (const body of bad) expect((await connectAs(user, body)).status).toBe(400);

    const ok = await connectAs(user, { password: "x", host: "SMTP.Company.test", port: 587 });
    expect(ok.json.mailbox).toEqual({ connected: true, host: "smtp.company.test", port: 587 });
  });

  test("disconnecting forgets the password", async () => {
    const user = await createUser({ mailbox: gmailMailbox() });
    const res = await call(disconnect, { method: "DELETE", userId: user._id });
    expect(res.json.mailbox.connected).toBe(false);
    expect(await storedMailbox(user)).toBeUndefined();
  });
});
