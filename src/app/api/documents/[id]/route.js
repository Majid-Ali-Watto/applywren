import { connectDB } from '@/lib/mongodb';
import Document from '@/models/Document';

export async function DELETE(req, { params }) {
  await connectDB();
  const { id } = params;
  await Document.findByIdAndDelete(id);
  return new Response(null, { status: 204 });
}

export async function PUT(req, { params }) {
  await connectDB();
  const { id } = params;
  const doc = await req.json();
  const updatedDoc = await Document.findByIdAndUpdate(id, doc, { new: true });
  return new Response(JSON.stringify(updatedDoc), { status: 200 });
}