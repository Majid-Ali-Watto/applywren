import { describe, expect, test } from "vitest";
import { POST as send } from "@/app/api/sendEmails/route";
import { GET as listApplications } from "@/app/api/applications/route";
import Application from "@/models/Application";
import Document from "@/models/Document";
import User from "@/models/User";
import { call, createUser, gmailMailbox, pdf, sentMail } from "./helpers";

// Two letters: a default one and a designer one with an extra portfolio.
const body = (overrides = {}) => ({
  subject: "{{role}} application – {{my_name}}",
  attachments: [
    { name: "resume.pdf", base64: pdf("resume") },
    { name: "portfolio.pdf", base64: pdf("portfolio") },
  ],
  messages: [
    { html: "<p>Dear {{name|Hiring Manager}}, I'd like the {{role}} role at {{company}}.</p><p>{{my_name}} {{my_phone|}}</p>", attachments: [0] },
    { html: "<p>Hi {{name|there}}, design portfolio attached for {{company}}.</p>", attachments: [0, 1] },
  ],
  recipients: [
    { email: "ann@acme.test", fields: { name: "Ann", company: "Acme", role: "Frontend" }, message: 0, cc: ["manager@acme.test"] },
    { email: "bob@acme.test", fields: { company: "Acme", role: "Frontend" }, message: 0 },
    { email: "sam@hooli.test", fields: { company: "Hooli", role: "Designer", my_name: "Spoofed" }, message: 1 },
  ],
  ...overrides,
});

const sendAs = (user, payload = body()) => call(send, { method: "POST", userId: user._id, body: payload });
// A user whose Gmail is connected, so applications go out from their address.
const sender = (options = {}) => createUser({ mailbox: gmailMailbox(), ...options });

describe("sending applications", () => {
  test("each recipient gets their own letter, files and personalization", async () => {
    const user = await sender({ email: "majid.ali@example.com", phone: "+1 555 0100" });
    const res = await sendAs(user);
    expect(res.status).toBe(200);
    expect(res.json.results.map((r) => r.status)).toEqual(["sent", "sent", "sent"]);

    const [ann, bob, sam] = sentMail();
    expect(ann.to).toBe("ann@acme.test");
    expect(ann.subject).toBe("Frontend application – Majid Ali"); // name guessed from the sender's email
    expect(ann.html).toContain("Dear Ann, I'd like the Frontend role at Acme.");
    expect(ann.html).toContain("Majid Ali +1 555 0100");
    expect(ann.attachments.map((a) => a.filename)).toEqual(["resume.pdf"]);
    expect(ann.from).toEqual({ name: "Majid Ali", address: "majid.ali@example.com" }); // from the user's own address

    expect(ann.cc).toEqual(["manager@acme.test"]); // CC only on the email it was set for
    expect(ann.bcc).toBeUndefined();
    expect(bob.cc).toBeUndefined();
    expect(bob.html).toContain("Dear Hiring Manager"); // fallback when no name

    expect(sam.subject).toBe("Designer application – Majid Ali"); // client-sent my_name ignored
    expect(sam.attachments.map((a) => a.filename)).toEqual(["resume.pdf", "portfolio.pdf"]);
  });

  test("goes out through the user's own mailbox, signed in as them", async () => {
    const user = await sender({ email: "jane@gmail.com" });
    await sendAs(user);
    const { transport } = sentMail()[0];
    expect(transport).toMatchObject({
      host: "142.250.4.109", // resolved once and checked to be public
      port: 465,
      secure: true,
      tls: { servername: "smtp.gmail.com" },
      auth: { user: "jane@gmail.com", pass: "app-password" },
    });
  });

  test("refuses to send until the user connects their email", async () => {
    const user = await createUser();
    const res = await sendAs(user);
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/Connect your email/);
    expect(sentMail()).toHaveLength(0);
    expect(await Application.countDocuments()).toBe(0);
  });

  test("with a local mail catcher (SMTP_HOST), sends from the user's address without a mailbox", async () => {
    process.env.SMTP_HOST = "localhost";
    try {
      const user = await createUser({ email: "jane@example.com" });
      expect((await sendAs(user)).status).toBe(200);
      expect(sentMail()[0].from.address).toBe("jane@example.com");
      expect(sentMail()[0].transport).toMatchObject({ host: "localhost" });
    } finally {
      delete process.env.SMTP_HOST;
    }
  });

  test("stops after the provider rejects the app password", async () => {
    const user = await sender({ mailbox: gmailMailbox("wrong-password") });
    const res = await sendAs(user);
    expect(res.status).toBe(200);
    expect(res.json.results.map((r) => r.status)).toEqual(["failed", "failed", "failed"]);
    expect(res.json.results[2].error).toMatch(/rejected the app password/);
    expect(await Application.countDocuments()).toBe(0);
  });

  test("copyMe sends a hidden copy of every email to the sender", async () => {
    const user = await sender({ email: "me@example.com" });
    const payload = body({ copyMe: true });
    payload.recipients[2].bcc = ["me@example.com", "agent@x.test"];
    await sendAs(user, payload);
    expect(sentMail().map((m) => m.bcc)).toEqual([["me@example.com"], ["me@example.com"], ["me@example.com", "agent@x.test"]]);
  });

  test("records one application per company and role, each with its own files", async () => {
    const user = await sender({ name: "Majid Ali" });
    await sendAs(user);
    const apps = (await call(listApplications, { userId: user._id })).json;
    const byCompany = Object.fromEntries(apps.map((a) => [a.company, a]));

    expect(Object.keys(byCompany).sort()).toEqual(["Acme", "Hooli"]);
    expect(byCompany.Acme.recipients.map((r) => r.email)).toEqual(["ann@acme.test", "bob@acme.test"]);
    expect(byCompany.Acme.resumeIds).toHaveLength(1);
    expect(byCompany.Acme.ccEmails).toEqual(["manager@acme.test"]);
    expect(byCompany.Hooli.ccEmails).toEqual([]);
    expect(byCompany.Hooli.resumeIds).toHaveLength(2);
    // Sender details are stored filled in; recipient placeholders stay for history.
    expect(byCompany.Acme.subject).toBe("{{role}} application – Majid Ali");
    // Files are stored once and hidden from the document library.
    expect(await Document.countDocuments({ archived: true })).toBe(2);
  });

  test("a failed delivery is reported and recorded, the rest still go out", async () => {
    const user = await sender();
    const payload = body();
    payload.recipients[1].email = "fail@acme.test";
    const res = await sendAs(user, payload);
    expect(res.json.results.find((r) => r.email === "fail@acme.test")).toMatchObject({ status: "failed", error: "Mailbox unavailable" });
    expect(sentMail()).toHaveLength(2);
    const acme = await Application.findOne({ company: "Acme" });
    expect(acme.recipients.map((r) => r.status)).toEqual(["sent", "failed"]);
  });

  test("refuses to send when a recipient is missing a required value", async () => {
    const user = await sender();
    const payload = body();
    delete payload.recipients[0].fields.company;
    payload.recipients[0].email = "ann@gmail.com"; // no company can be guessed either
    const res = await sendAs(user, payload);
    expect(res.status).toBe(400);
    expect(res.json.error).toContain("ann@gmail.com (company)");
    expect(sentMail()).toHaveLength(0);
  });

  test("rejects malformed requests before sending anything", async () => {
    const user = await sender();
    const cases = [
      body({ attachments: [{ name: "x.pdf", base64: Buffer.from("not a pdf").toString("base64") }] }),
      body({ messages: [{ html: "<p>x</p>", attachments: [5] }] }),
      body({ recipients: [{ email: "a@b.com\r\nBcc: evil@x.com", fields: {}, message: 0 }] }),
      body({ recipients: [{ email: "a@b.com", fields: {}, message: 9 }] }),
      body({ recipients: [{ email: "a@b.com", fields: {}, message: 0, cc: ["not-an-email"] }] }),
      body({ recipients: [{ email: "a@b.com", fields: {}, message: 0, bcc: Array.from({ length: 11 }, (_, i) => `b${i}@x.com`) }] }),
      "not json",
    ];
    for (const payload of cases) {
      expect((await sendAs(user, payload)).status).toBe(400);
    }
    expect(sentMail()).toHaveLength(0);
  });

  test("one send at a time per account", async () => {
    const user = await sender({ sendingUntil: new Date(Date.now() + 60_000) }); // another send is running
    const res = await sendAs(user);
    expect(res.status).toBe(429);
    expect(sentMail()).toHaveLength(0);

    await User.updateOne({ _id: user._id }, { sendingUntil: new Date(Date.now() - 1000) }); // a crashed send's slot expires
    expect((await sendAs(user)).status).toBe(200);
    expect((await User.findById(user._id)).sendingUntil).toBeNull(); // released when done
  });

  test("enforces the daily recipient limit", async () => {
    const user = await sender();
    await Application.create({
      userId: user._id.toString(),
      subject: "s",
      coverLetter: "c",
      recipients: Array.from({ length: 99 }, (_, i) => ({ email: `r${i}@x.test`, status: "sent" })),
    });
    const res = await sendAs(user);
    expect(res.status).toBe(429);
    expect(sentMail()).toHaveLength(0);
  });
});
