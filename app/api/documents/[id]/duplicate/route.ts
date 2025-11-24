import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Document from "@/models/Document";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const originalDoc = await Document.findById(id);
    if (!originalDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const newDoc = await Document.create({
      name: `${originalDoc.name} (Copy)`,
      authorId: originalDoc.authorId,
      content: originalDoc.content,
      commentsCount: originalDoc.commentsCount,
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("Error duplicating document:", error);
    return NextResponse.json(
      { error: "Failed to duplicate document" },
      { status: 500 }
    );
  }
}
