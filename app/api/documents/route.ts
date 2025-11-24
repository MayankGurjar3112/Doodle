import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Document from "@/models/Document";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get("authorId");

    const query = authorId
      ? { authorId, archived: false }
      : { archived: false };

    const documents = await Document.find(query).sort({ updatedAt: -1 });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Basic validation
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check document limit
    const count = await Document.countDocuments({ authorId: body.authorId });
    if (count >= 3) {
      return NextResponse.json(
        { error: "You have reached the limit of 3 documents." },
        { status: 403 }
      );
    }

    const doc = await Document.create({
      name: body.name,
      authorId: body.authorId || "anonymous",
      content: body.content || {},
      commentsCount: 0,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
