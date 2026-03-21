import { NextRequest, NextResponse } from "next/server";
import { askGemini, parseJSON } from "@/lib/gemini";
import { Contractor, NegotiatedQuote } from "@/lib/types";
import { getContractorHistory, logNegotiation } from "@/lib/sheets";
import { initiateNegotiationCall } from "@/lib/voice";

export async function POST(req: NextRequest) {
  try {
    const {
      contractors,
      issue,
      budget,
      tradeType,
      zip,
      ownerName,
      enableCalls,
    }: {
      contractors: Contractor[];
      issue: string;
      budget: number;
      tradeType: string;
      zip: string;
      ownerName: string;
      enableCalls: boolean;
    } = await req.json();

    // ── Fetch history for all contractors in parallel ───────────────────────
    const histories = await Promise.all(
      contractors.map((c) => getContractorHistory(c.name, tradeType, zip ?? ""))
    );

    // ── Build Gemini prompt with history context ────────────────────────────
    const contractorDetails = contractors
      .map((c, i) => {
        const hist = histories[i];
        return `${i + 1}. ${c.name} (${c.rating}★)
   Current quote: $${c.estimateMin}–$${c.estimateMax}
   History:\n${hist.split("\n").map((l) => `   ${l}`).join("\n")}`;
      })
      .join("\n\n");

    const prompt = `
You are BidBot, an AI property repair negotiation agent.
Issue: "${issue}" | Trade: ${tradeType} | Zip: ${zip} | Budget: $${budget || "open"}

You are about to call these contractors simultaneously to negotiate prices.
Use their history to inform realistic expected outcomes:

${contractorDetails}

Generate realistic negotiation outcomes for each contractor.
Consider:
- If they previously settled lower, they likely will again
- If they raised prices since last time, note it in the negotiation note
- Higher rated shops negotiate less aggressively
- Target price should be 15-30% below their current quote

Respond ONLY with valid JSON array (no markdown):
[
  {
    "contractorId": "placeholder",
    "contractorName": "exact name",
    "originalMin": 200,
    "originalMax": 260,
    "negotiatedMin": 160,
    "negotiatedMax": 200,
    "saved": 40,
    "availability": "Tomorrow 10:00–12:00 PM",
    "negotiationNote": "Said they can match last month's rate if we book this week."
  }
]
`;

    const raw = await askGemini(prompt);
    const aiQuotes = parseJSON<NegotiatedQuote[]>(raw);

    // ── Launch all calls in parallel + log results ──────────────────────────
    const enrichedQuotes = await Promise.all(
      aiQuotes.map(async (q, i) => {
        const contractor = contractors[i];
        if (!contractor) return { ...q, contractorId: String(i) };

        const history = histories[i];
        let conversationId = "";

        if (enableCalls && contractor.phone && contractor.phone !== "N/A") {
          // Fire real ElevenLabs conversational AI call
          const callResult = await initiateNegotiationCall({
            toPhone: contractor.phone,
            contractorName: contractor.name,
            tradeType,
            issue,
            originalMin: contractor.estimateMin,
            originalMax: contractor.estimateMax,
            targetMin: q.negotiatedMin,
            targetMax: q.negotiatedMax,
            ownerZip: zip ?? "",
            ownerName: ownerName ?? "the property owner",
            budget: budget ?? 0,
            history,
          });
          conversationId = callResult.conversationId;
        }

        // Log negotiation to Sheets
        await logNegotiation({
          contractorName: contractor.name,
          contractorPhone: contractor.phone,
          tradeType,
          zip: zip ?? "",
          issue,
          originalMin: contractor.estimateMin,
          originalMax: contractor.estimateMax,
          negotiatedMin: q.negotiatedMin,
          negotiatedMax: q.negotiatedMax,
          saved: q.saved,
          conversationId,
          callMode: enableCalls ? "real" : "simulated",
        });

        return {
          ...q,
          contractorId: contractor.id,
          conversationId: conversationId || undefined,
        };
      })
    );

    return NextResponse.json({ quotes: enrichedQuotes });
  } catch (e: any) {
    console.error("negotiate error:", e);
    return NextResponse.json(
      { error: e.message ?? "Negotiation failed" },
      { status: 500 }
    );
  }
}