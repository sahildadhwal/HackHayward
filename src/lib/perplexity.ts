export interface PerplexityContractor {
  name: string;
  phone: string;
  rating: number;
  reviewCount: number;
  address: string;
}

export async function searchContractors(
  tradeType: string,
  zip: string,
  limit = 5
): Promise<PerplexityContractor[]> {
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
          content:
            "You are a helpful assistant that finds local contractors. Always respond with valid JSON only — no markdown, no explanation.",
        },
        {
          role: "user",
          content: `Find ${limit} real licensed ${tradeType}s near zip code ${zip} in the United States.
Return ONLY a JSON array like this (no markdown, no extra text):
[
  {
    "name": "ABC Plumbing Co",
    "phone": "(510) 555-0100",
    "rating": 4.6,
    "reviewCount": 143,
    "address": "1234 Main St, Hayward, CA 94541"
  }
]
Use real businesses from Yelp or Google. If exact data is unavailable, use realistic estimates.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Perplexity error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw: string = data.choices[0].message.content;
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as PerplexityContractor[];
  } catch {
    // Fallback: extract first JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as PerplexityContractor[];
    throw new Error("Could not parse Perplexity contractor response");
  }
}
