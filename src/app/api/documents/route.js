import { connectDB } from '@/lib/mongodb';
import Document from '@/models/Document';

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  
  const documents = await Document.find({ userId });
  return new Response(JSON.stringify(documents), { status: 200 });
}

export async function POST(req) {
  await connectDB();
  const doc = await req.json();
  const newDoc = await Document.create(doc);
  return new Response(JSON.stringify(newDoc), { status: 201 });
}