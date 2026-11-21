import { connectDB } from "@/lib/mongodb";
import Application from "@/models/Application";
import { currentUserId } from "@/lib/accounts";
import { errorResponse } from "@/lib/http";

// Applications are created by /api/sendEmails after the emails go out.
export async function GET(req) {
  try {
    await connectDB();
    const applications = await Application.find({ userId: await currentUserId(req) }).sort({ appliedAt: -1 });
    return Response.json(applications);
  } catch (error) {
    return errorResponse(error, "Applications GET");
  }
}
