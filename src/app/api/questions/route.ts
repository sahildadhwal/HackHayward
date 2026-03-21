import { NextRequest, NextResponse } from "next/server";
import { askGemini, parseJSON } from "@/lib/gemini";
import { Question } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { issue } = await req.json();

  const prompt = `
You are an expert contractor. A property owner reports: "${issue}"

Ask exactly 2 clarifying questions to better diagnose the issue.
Respond ONLY with valid JSON (no markdown):
[
  { "id": "q1", "text": "Question text?", "options": ["Option A", "Option B", "Option C"] },
  { "id": "q2", "text": "Question text?", "options": ["Option A", "Option B"] }
]
Keep questions short and practical. 2–3 options each.
`;

  try {
    const raw = await askGemini(prompt);
    const questions = parseJSON<Question[]>(raw);
    return NextResponse.json({ questions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to generate questions" }, { status: 500 });
  }
}
