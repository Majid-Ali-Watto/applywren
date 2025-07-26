import { connectDB } from '@/lib/mongodb';
import Application from '@/models/Application';

export async function PUT(req, context) {
  await connectDB();

  const { id } = await context.params; // ✅ await the async params
  const { status } = await req.json();

  const application = await Application.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  return new Response(JSON.stringify(application), { status: 200 });
}
