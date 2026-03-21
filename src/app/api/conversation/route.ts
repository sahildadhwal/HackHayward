import { NextRequest, NextResponse } from "next/server";
import { getConversation } from "@/lib/voice";
import { askGemini } from "@/lib/gemini";

// GET /api/conversation?id=conv_xxx
// Polled by the frontend to check if a call has completed
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("id");

  if (!conversationId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const conv = await getConversation(conversationId);

    // If done, extract negotiated price from transcript
    let negotiatedPrice: string | null = null;
    if (conv.status === "done" && conv.transcript.length > 0) {
      const transcriptText = conv.transcript
        .map((t) => `${t.role === "agent" ? "BidBot" : "Contractor"}: ${t.message}`)
        .join("\n");

      const prompt = `
From this negotiation call transcript, extract the final agreed price.
If the contractor agreed to a specific price, return just that price like "$185" or "$180-$200".
If no price was agreed, return "No agreement".
Return ONLY the price string, nothing else.

Transcript:
${transcriptText}
`;
      try {
        const raw = await askGemini(prompt);
        negotiatedPrice = raw.trim().replace(/```/g, "");
      } catch {
        negotiatedPrice = null;
      }
    }

    return NextResponse.json({
      conversationId,
      status: conv.status,
      transcript: conv.transcript,
      summary: conv.summary,
      negotiatedPrice,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}