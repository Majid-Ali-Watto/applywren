import { connectDB } from "@/lib/mongodb";
import Document from "@/models/Document";
import { currentUserId } from "@/lib/accounts";
import { readJson, errorResponse } from "@/lib/http";
import { MAX_DOCUMENT_BODY_BYTES } from "@/lib/limits";
import { assertRoomFor, decodePdf, fileHash, storeFile, validateLetter } from "@/lib/documents";
import { assert } from "@/lib/validate";

// Lists the user's documents. File contents are omitted (fetch one by id);
// cover letter HTML is included since it is small and edited inline.
export async function GET(req) {
  try {
    await connectDB();
    const documents = await Document.aggregate([
      { $match: { userId: await currentUserId(req), archived: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          type: 1,
          name: 1,
          createdAt: 1,
          content: { $cond: [{ $eq: ["$type", "file"] }, "$$REMOVE", "$content"] },
        },
      },
    ]);
    return Response.json(documents);
  } catch (error) {
    return errorResponse(error, "Documents GET");
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const userId = await currentUserId(req);
    const { type, name, content } = await readJson(req, { maxBytes: MAX_DOCUMENT_BODY_BYTES });
    assert(type === "file" || type === "coverLetter", "Invalid document type");

    if (type === "file") {
      const bytes = decodePdf({ name, base64: content });
      const stored = await Document.exists({ userId, type: "file", hash: fileHash(bytes) });
      if (!stored) await assertRoomFor(userId, { adding: "file", bytes: content.length });
      const doc = await storeFile(userId, name.trim(), bytes, { archived: false });
      return Response.json(doc, { status: 201 });
    }

    validateLetter({ name, content });
    await assertRoomFor(userId, { adding: "coverLetter", bytes: Buffer.byteLength(content) });
    const doc = await Document.create({ userId, type, name: name.trim(), content });
    return Response.json(doc, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Documents POST");
  }
}
