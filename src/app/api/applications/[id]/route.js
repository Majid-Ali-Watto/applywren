import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Application, { APPLICATION_STATUSES } from "@/models/Application";
import { currentUserId } from "@/lib/accounts";
import { readJson, errorResponse } from "@/lib/http";
import { assert } from "@/lib/validate";

export async function PUT(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    const { status } = await readJson(req);
    assert(APPLICATION_STATUSES.includes(status), "Invalid status");

    const application = isValidObjectId(id)
      ? await Application.findOneAndUpdate(
          { _id: id, userId: await currentUserId(req) },
          { status },
          { new: true }
        )
      : null;
    if (!application) {
      return Response.json({ error: "Application not found" }, { status: 404 });
    }
    return Response.json(application);
  } catch (error) {
    return errorResponse(error, "Application PUT");
  }
}
