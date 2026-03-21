import { NextRequest, NextResponse } from "next/server";
import { askGemini, parseJSON } from "@/lib/gemini";
import { DIYGuide } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { issue, diagnosis } = await req.json();

  const prompt = `
A property owner wants to fix this themselves:
Issue: "${issue}"
Diagnosis: ${diagnosis.issue} (${diagnosis.tradeType}, urgency: ${diagnosis.urgency})

Generate a complete DIY repair guide. Respond ONLY with valid JSON (no markdown):
{
  "difficulty": "Easy",
  "timeEstimate": "30–45 minutes",
  "totalCost": 25,
  "supplies": [
    { "item": "P-trap replacement kit", "estimatedCost": 12, "where": "Home Depot" },
    { "item": "Plumber's tape", "estimatedCost": 4, "where": "Home Depot or Amazon" },
    { "item": "Bucket and towels", "estimatedCost": 0, "where": "You already have these" }
  ],
  "steps": [
    "Turn off the water supply valve under the sink",
    "Place a bucket under the P-trap to catch water",
    "Unscrew the slip nuts on both ends of the P-trap by hand",
    "Remove the old P-trap and discard it",
    "Install the new P-trap, hand-tighten the slip nuts",
    "Turn the water back on and check for leaks"
  ],
  "safetyWarnings": [
    "Always turn off water supply before starting",
    "Do not overtighten plastic fittings — hand tight is enough"
  ],
  "whenToCallPro": "If you see black mold, corrosion on other pipes, or the leak returns within 24 hours"
}

difficulty: Easy | Medium | Hard
Be realistic about difficulty — electrical panel work is Hard, replacing a faucet washer is Easy.
Steps should be specific, numbered, and actionable (6–10 steps).
Supply costs should be realistic US prices.
`;

  try {
    const raw = await askGemini(prompt);
    const guide = parseJSON<DIYGuide>(raw);
    return NextResponse.json(guide);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "DIY guide failed" }, { status: 500 });
  }
}
