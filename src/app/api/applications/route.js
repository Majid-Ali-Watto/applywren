import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Application from '@/models/Application';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const applications = await Application.find({ userId }).sort({ appliedAt: -1 });
    return NextResponse.json(applications);
  } catch (error) {
    console.error('Applications GET error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
 
    const application = new Application(body);
    await application.save();
    return NextResponse.json(application);
  } catch (error) {
    console.error("Applications POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
