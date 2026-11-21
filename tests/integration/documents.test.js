import { describe, expect, test } from "vitest";
import { GET as list, POST as create } from "@/app/api/documents/route";
import { DELETE as remove, GET as getOne, PUT as update } from "@/app/api/documents/[id]/route";
import Application from "@/models/Application";
import Document from "@/models/Document";
import { call, createUser, pdf } from "./helpers";
import { MAX_LIBRARY_FILES } from "@/lib/limits";

const upload = (userId, name = "resume.pdf", content = pdf()) =>
  call(create, { method: "POST", userId, body: { type: "file", name, content } });

describe("documents", () => {
  test("each account has a file limit; re-uploading a stored file still works", async () => {
    const user = await createUser();
    await Document.insertMany(
      Array.from({ length: MAX_LIBRARY_FILES }, (_, i) => ({ userId: user._id.toString(), type: "file", name: `f${i}.pdf`, content: pdf(`f${i}`), hash: `h${i}` }))
    );
    const res = await upload(user._id, "one-more.pdf", pdf("one more"));
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/up to 50 files/);

    await Document.updateOne({ name: "f0.pdf" }, { archived: true }); // archived files don't count
    expect((await upload(user._id, "one-more.pdf", pdf("one more"))).status).toBe(201);
  });

  test("stores PDFs, rejects other files, and lists files without their content", async () => {
    const user = await createUser();
    expect((await upload(user._id)).status).toBe(201);
    const notPdf = await upload(user._id, "x.pdf", Buffer.from("hello").toString("base64"));
    expect(notPdf.status).toBe(400);

    const letter = await call(create, { method: "POST", userId: user._id, body: { type: "coverLetter", name: "Main", content: "<p>Hi</p>" } });
    expect(letter.status).toBe(201);

    const docs = (await call(list, { userId: user._id })).json;
    expect(docs.map((d) => d.type).sort()).toEqual(["coverLetter", "file"]);
    expect(docs.find((d) => d.type === "file").content).toBeUndefined();
    expect(docs.find((d) => d.type === "coverLetter").content).toBe("<p>Hi</p>");
  });

  test("uploading the same bytes twice keeps one document", async () => {
    const user = await createUser();
    const first = await upload(user._id, "resume.pdf");
    const second = await upload(user._id, "resume-copy.pdf");
    expect(second.json._id).toBe(first.json._id);
    expect(await Document.countDocuments()).toBe(1);
  });

  test("other users cannot read, edit or delete a document", async () => {
    const owner = await createUser({ email: "owner@example.com" });
    const other = await createUser({ email: "other@example.com" });
    const letter = await call(create, { method: "POST", userId: owner._id, body: { type: "coverLetter", name: "Mine", content: "<p>x</p>" } });
    const id = letter.json._id;

    expect((await call(list, { userId: other._id })).json).toEqual([]);
    expect((await call(getOne, { userId: other._id, params: { id } })).status).toBe(404);
    expect((await call(update, { method: "PUT", userId: other._id, params: { id }, body: { name: "Hacked", content: "x" } })).status).toBe(404);
    expect((await call(remove, { method: "DELETE", userId: other._id, params: { id } })).status).toBe(404);
    expect((await Document.findById(id)).name).toBe("Mine");
  });

  test("ignores a userId in the body: documents belong to the signed-in user", async () => {
    const user = await createUser();
    const res = await call(create, {
      method: "POST",
      userId: user._id,
      body: { type: "coverLetter", name: "L", content: "<p>x</p>", userId: "someone-else" },
    });
    expect(res.json.userId).toBe(user._id.toString());
  });

  test("deleting a file used by an application hides it instead, so history keeps it", async () => {
    const user = await createUser();
    const used = (await upload(user._id, "used.pdf", pdf("used"))).json;
    const unused = (await upload(user._id, "unused.pdf", pdf("unused"))).json;
    await Application.create({
      userId: user._id.toString(), subject: "s", coverLetter: "c", resumeIds: [used._id], recipients: [{ email: "a@b.com", status: "sent" }],
    });

    expect((await call(remove, { method: "DELETE", userId: user._id, params: { id: used._id } })).status).toBe(204);
    expect((await call(remove, { method: "DELETE", userId: user._id, params: { id: unused._id } })).status).toBe(204);

    expect((await Document.findById(used._id)).archived).toBe(true);
    expect(await Document.findById(unused._id)).toBeNull();
    expect((await call(list, { userId: user._id })).json).toEqual([]);
  });

  test("invalid ids are a 404, not a crash", async () => {
    const user = await createUser();
    expect((await call(getOne, { userId: user._id, params: { id: "not-an-id" } })).status).toBe(404);
  });
});
