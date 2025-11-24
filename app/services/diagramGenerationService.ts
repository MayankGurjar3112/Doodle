import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert technical diagram generator for a documentation tool similar to Eraser.io. 
Your task is to interpret natural language notes or markdown documentation and convert them into VALID Mermaid.js syntax.

Rules:
1. Output ONLY the Mermaid.js code. Do not wrap it in markdown code blocks (e.g., no \`\`\`mermaid).
2. Do not provide any explanation, preamble, or postscript.
3. If the notes imply a process, use a Flowchart (graph TD or LR).
4. If the notes imply data structure, use a Class Diagram or ER Diagram.
5. If the notes imply interaction over time, use a Sequence Diagram.
6. If the notes are a list of ideas, use a Mindmap.
7. Use clear, readable node labels.
8. Style the graph to look professional and clean (minimal colors, rounded corners where applicable).

Example Input:
"User logs in, system checks credentials. If valid, redirect to dashboard. If invalid, show error."

Example Output:
graph TD
    A[User] -->|Logs in| B(System)
    B -->|Check Credentials| C{Valid?}
    C -->|Yes| D[Dashboard]
    C -->|No| E[Show Error]
`;

export const generateDiagramCode = async (
  notes: string,
  currentCode: string
): Promise<string> => {
  try {
    const prompt = `
    Current Diagram Code (if any):
    ${currentCode}

    User Notes/Documentation:
    ${notes}

    Generate or update the Mermaid.js diagram based on the User Notes.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for deterministic code generation
      },
    });

    const text = response.text;
    // Cleanup potential markdown fences just in case the model slips up
    const cleanText = text
      ?.replace(/```mermaid/g, "")
      .replace(/```/g, "")
      .trim();
    return cleanText || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(
      "Failed to generate diagram. Please check your API key and try again."
    );
  }
};
