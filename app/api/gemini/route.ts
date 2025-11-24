import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.API_KEY;

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "API_KEY environment variable not set" },
      { status: 500 }
    );
  }

  try {
    const { message } = await req.json();

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `You are an expert AI assistant specialized in diagrams, flowcharts, and creative brainstorming. 
        Users are on a collaborative whiteboard app. Provide concise, helpful, and inspiring answers. 
        You can generate ideas, explain concepts, or help structure thoughts. 
        Use markdown for formatting when appropriate (e.g., lists, bold text).
        
        IMPORTANT: If the user explicitly asks to create, generate, or draw a diagram (flowchart, mindmap, etc.), 
        you MUST output a special tag at the end of your response: [[GENERATE_DIAGRAM: <summary of the diagram request>]]
        For example: "Sure, I can help with that. [[GENERATE_DIAGRAM: Flowchart for login process]]"
        Do not generate the mermaid code yourself, just use the tag.`,
      },
    });

    const result = await chat.sendMessageStream({ message });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error in Gemini API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
