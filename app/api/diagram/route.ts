import { NextRequest, NextResponse } from "next/server";
import { generateDiagramCode } from "@/app/services/diagramGenerationService";

export async function POST(req: NextRequest) {
  try {
    const { notes, currentCode } = await req.json();

    if (!notes) {
      return NextResponse.json(
        { error: "Notes are required" },
        { status: 400 }
      );
    }

    const code = await generateDiagramCode(notes, currentCode || "");
    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error generating diagram:", error);
    return NextResponse.json(
      { error: "Failed to generate diagram" },
      { status: 500 }
    );
  }
}
