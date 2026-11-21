import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Document from "@/models/Document";
import Application from "@/models/Application";
import { currentUserId } from "@/lib/accounts";
import { readJson, errorResponse } from "@/lib/http";
import { MAX_DOCUMENT_BODY_BYTES } from "@/lib/limits";
import { assertRoomFor, validateLetter, MAX_NAME_CHARS } from "@/lib/documents";
import { assert, isNonEmptyString } from "@/lib/validate";

const notFound = () => Response.json({ error: "Document not found" }, { status: 404 });

async function ownedFilter(req, context) {
  const { id } = await context.params;
  return isValidObjectId(id) ? { _id: id, userId: await currentUserId(req) } : null;
}

export async function GET(req, context) {
  try {
    await connectDB();
    const filter = await ownedFilter(req, context);
    const doc = filter && (await Document.findOne(filter));
    return doc ? Response.json(doc) : notFound();
  } catch (error) {
    return errorResponse(error, "Document GET");
  }
}

export async function PUT(req, context) {
  try {
    await connectDB();
    const filter = await ownedFilter(req, context);
    const existing = filter && (await Document.findOne(filter).select("type userId"));
    if (!existing) return notFound();

    const { name, content } = await readJson(req, { maxBytes: MAX_DOCUMENT_BODY_BYTES });
    let update;
    if (existing.type === "coverLetter") {
      validateLetter({ name, content });
      await assertRoomFor(existing.userId, { bytes: Buffer.byteLength(content) });
      update = { name: name.trim(), content };
    } else {
      assert(isNonEmptyString(name, MAX_NAME_CHARS), "Invalid name");
      update = { name: name.trim() };
    }

    const doc = await Document.findOneAndUpdate(filter, update, {
      new: true,
      projection: existing.type === "file" ? { content: 0 } : {},
    });
    return doc ? Response.json(doc) : notFound();
  } catch (error) {
    return errorResponse(error, "Document PUT");
  }
}

// Files still referenced by an application are archived instead of deleted,
// so application history keeps its attachments.
export async function DELETE(req, context) {
  try {
    await connectDB();
    const filter = await ownedFilter(req, context);
    if (!filter) return notFound();

    const inUse = await Application.exists({ userId: filter.userId, resumeIds: filter._id });
    const result = inUse
      ? await Document.updateOne(filter, { archived: true })
      : await Document.deleteOne(filter);
    const affected = inUse ? result.matchedCount : result.deletedCount;
    return affected ? new Response(null, { status: 204 }) : notFound();
  } catch (error) {
    return errorResponse(error, "Document DELETE");
  }
}
