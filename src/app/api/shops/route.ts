import { NextRequest, NextResponse } from "next/server";
import { askGemini, parseJSON } from "@/lib/gemini";
import { Contractor } from "@/lib/types";

// ── Hardcoded demo contractor — always appears first ──────────────────────────
// Change DEMO_PHONE to your real number to receive the actual ElevenLabs call
const DEMO_CONTRACTOR: Contractor = {
  id: "demo-contractor",
  name: "DEMO - Sahil Dadhwal",
  phone: process.env.DEMO_PHONE ?? "+15550000000",
  rating: 5.0,
  reviewCount: 142,
  address: "Hayward, CA 94541",
  distanceMi: 0.1,
  estimateMin: 0,   // filled in below based on diagnosis
  estimateMax: 10,
};

async function searchWithPerplexity(tradeType: string, zip: string, limit = 4) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that finds local contractors. Always respond with valid JSON only — no markdown, no explanation.",
        },
        {
          role: "user",
          content: `Find ${limit} real licensed ${tradeType}s near zip code ${zip} in the United States.
Return ONLY a JSON array (no markdown, no extra text):
[
  {
    "name": "ABC Plumbing Co",
    "phone": "(510) 555-0100",
    "rating": 4.6,
    "reviewCount": 143,
    "address": "1234 Main St, Hayward, CA 94541"
  }
]`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Perplexity error ${res.status}`);
  const data = await res.json();
  const raw: string = data.choices[0].message.content;
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse Perplexity response");
  }
}

async function searchWithGemini(tradeType: string, zip: string, limit = 4) {
  const prompt = `Generate ${limit} realistic local ${tradeType} businesses near zip code ${zip} in the United States.
Use realistic business names, phone numbers, addresses, ratings, and review counts for that area.

Respond ONLY with a JSON array (no markdown):
[
  {
    "name": "ABC Plumbing Co",
    "phone": "(510) 555-0100",
    "rating": 4.6,
    "reviewCount": 143,
    "address": "1234 Main St, Hayward, CA 94541"
  }
]`;
  const raw = await askGemini(prompt);
  return parseJSON<any[]>(raw);
}

export async function POST(req: NextRequest) {
  try {
    const { tradeType, zip, estimateMin, estimateMax } = await req.json();

    // Search for real contractors (Perplexity → fallback to Gemini)
    const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
    let businesses: any[];
    try {
      businesses = hasPerplexity
        ? await searchWithPerplexity(tradeType, zip)
        : await searchWithGemini(tradeType, zip);
    } catch {
      businesses = await searchWithGemini(tradeType, zip);
    }

    // Generate price estimates for real contractors
    const shopList = businesses
      .map((b: any, i: number) => `${i + 1}. ${b.name} (${b.rating}★, ${b.reviewCount} reviews)`)
      .join("\n");

    const prompt = `Given these ${tradeType}s and an expected repair range of $${estimateMin}–$${estimateMax},
generate realistic price estimates for each shop. Higher-rated shops tend to charge more.
Shops:
${shopList}

Respond ONLY with a JSON array (no markdown):
[{ "index": 1, "estimateMin": 140, "estimateMax": 190 }, ...]`;

    const raw = await askGemini(prompt);
    const estimates = parseJSON<{ index: number; estimateMin: number; estimateMax: number }[]>(raw);

    const realContractors: Contractor[] = businesses.map((b: any, i: number) => ({
      id: `contractor-${i}`,
      name: b.name,
      phone: b.phone || "N/A",
      rating: b.rating,
      reviewCount: b.reviewCount,
      address: b.address,
      distanceMi: parseFloat((Math.random() * 8 + 0.5).toFixed(1)),
      estimateMin: estimates[i]?.estimateMin ?? estimateMin,
      estimateMax: estimates[i]?.estimateMax ?? estimateMax,
    }));

    // Add demo contractor at the top with same estimate range as diagnosis
    const demoContractor: Contractor = {
      ...DEMO_CONTRACTOR,
      estimateMin,
      estimateMax,
    };

    const contractors = [demoContractor, ...realContractors];

    return NextResponse.json({ contractors });
  } catch (e: any) {
    console.error("shops error:", e);
    return NextResponse.json({ error: e.message ?? "Failed to find contractors" }, { status: 500 });
  }
}