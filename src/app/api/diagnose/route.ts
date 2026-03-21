import { NextRequest, NextResponse } from "next/server";
import { parseJSON } from "@/lib/gemini";
import { askGeminiVision } from "@/lib/gemini-vision";
import { Diagnosis } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { issue, answers, imageBase64, mimeType } = await req.json();

  const answerText = Object.entries(answers)
    .map(([q, a]) => `- ${q}: ${a}`)
    .join("\n");

  const imageContext = imageBase64
    ? "\nAn image of the issue has been provided. Use it to improve your diagnosis accuracy and confidence."
    : "";

  const prompt = `You are an expert contractor. A property owner reports:
Issue: "${issue}"
Follow-up answers:
${answerText}${imageContext}

${imageBase64 ? "Analyze the image carefully — look for visible damage, corrosion, water stains, structural issues, or any other relevant details that help confirm or refine the diagnosis." : ""}

Provide a clear diagnosis. Respond ONLY with valid JSON (no markdown):
{
  "issue": "One-line diagnosis (e.g. P-trap connection leak)",
  "tradeType": "plumber",
  "urgency": "medium",
  "estimateMin": 120,
  "estimateMax": 180,
  "riskScore": 6,
  "riskIfIgnored": "One sentence on what happens if not fixed",
  "isDIYable": true,
  "imageConfidence": "high"
}
urgency: low | medium | high
tradeType: plumber | electrician | hvac | roofer | locksmith | handyman | appliance repair | pest control
riskScore: 1–10
isDIYable: true only if safe and realistic for a non-professional homeowner
imageConfidence: "high" if image clearly shows the issue, "medium" if partially visible, "low" if image doesn't help, "none" if no image provided`;

  try {
    const raw = await askGeminiVision(
      prompt,
      imageBase64 ?? undefined,
      mimeType ?? "image/jpeg"
    );
    const diagnosis = parseJSON<Diagnosis & { imageConfidence?: string }>(raw);
    return NextResponse.json(diagnosis);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Diagnosis failed" }, { status: 500 });
  }
}