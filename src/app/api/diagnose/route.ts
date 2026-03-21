import { NextRequest, NextResponse } from "next/server";
import { askGemini, parseJSON } from "@/lib/gemini";
import { Diagnosis } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { issue, answers } = await req.json();

  const answerText = Object.entries(answers)
    .map(([q, a]) => `- ${q}: ${a}`)
    .join("\n");

  const prompt = `
You are an expert contractor. A property owner reports:
Issue: "${issue}"
Follow-up answers:
${answerText}

Provide a clear diagnosis. Respond ONLY with valid JSON (no markdown):
{
  "issue": "One-line diagnosis (e.g. P-trap connection leak)",
  "tradeType": "plumber",
  "urgency": "medium",
  "estimateMin": 120,
  "estimateMax": 180,
  "riskScore": 6,
  "riskIfIgnored": "One sentence on what happens if not fixed",
  "isDIYable": true
}
urgency: low | medium | high
tradeType: plumber | electrician | hvac | roofer | locksmith | handyman | appliance repair | pest control
riskScore: 1–10
isDIYable: true only if the repair is safe and realistic for a non-professional homeowner (e.g. replacing a faucet washer = true, rewiring a circuit = false)
`;

  try {
    const raw = await askGemini(prompt);
    const diagnosis = parseJSON<Diagnosis>(raw);
    return NextResponse.json(diagnosis);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Diagnosis failed" }, { status: 500 });
  }
}
