import { describe, expect, test } from "vitest";
import { GET as getProfile, PUT as putProfile } from "@/app/api/me/route";
import { GET as listApplications } from "@/app/api/applications/route";
import { PUT as setStatus } from "@/app/api/applications/[id]/route";
import Application from "@/models/Application";
import { call, createUser } from "./helpers";

describe("profile (/api/me)", () => {
  test("saves name, phone and link, and returns them", async () => {
    const user = await createUser({ email: "jane@example.com" });
    const res = await call(putProfile, {
      method: "PUT",
      userId: user._id,
      body: { name: " Jane Doe ", phone: "+1 (555) 010-0100", link: "https://linkedin.com/in/jane" },
    });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ email: "jane@example.com", name: "Jane Doe", phone: "+1 (555) 010-0100", link: "https://linkedin.com/in/jane" });
    expect((await call(getProfile, { userId: user._id })).json.phone).toBe("+1 (555) 010-0100");
  });

  test("adds https:// to links typed without it", async () => {
    const user = await createUser();
    const res = await call(putProfile, { method: "PUT", userId: user._id, body: { link: "linkedin.com/in/jane" } });
    expect(res.json.link).toBe("https://linkedin.com/in/jane");
  });

  test("rejects unsafe links and odd phone numbers", async () => {
    const user = await createUser();
    for (const body of [{ link: "javascript:alert(1)" }, { link: "ftp://x.com" }, { phone: "<script>" }]) {
      expect((await call(putProfile, { method: "PUT", userId: user._id, body })).status).toBe(400);
    }
  });
});

describe("applications", () => {
  const make = (userId, company) =>
    Application.create({ userId: userId.toString(), company, subject: "s", coverLetter: "c", recipients: [{ email: "a@b.com", status: "sent" }] });

  test("lists only the signed-in user's applications, newest first", async () => {
    const jane = await createUser({ email: "jane@example.com" });
    const other = await createUser({ email: "other@example.com" });
    await make(jane._id, "Acme");
    await make(other._id, "Secret Co");
    await make(jane._id, "Globex");
    const res = await call(listApplications, { userId: jane._id });
    expect(res.json.map((a) => a.company)).toEqual(["Globex", "Acme"]);
  });

  test("status can be changed by the owner only, and only to a known status", async () => {
    const jane = await createUser({ email: "jane@example.com" });
    const other = await createUser({ email: "other@example.com" });
    const app = await make(jane._id, "Acme");
    const params = { id: app._id.toString() };

    expect((await call(setStatus, { method: "PUT", userId: other._id, params, body: { status: "accepted" } })).status).toBe(404);
    expect((await call(setStatus, { method: "PUT", userId: jane._id, params, body: { status: "Interviewing" } })).status).toBe(400);
    const ok = await call(setStatus, { method: "PUT", userId: jane._id, params, body: { status: "interviewing" } });
    expect(ok.json.status).toBe("interviewing");
  });
});
