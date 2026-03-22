import { NextRequest, NextResponse } from "next/server";
import { askGemini } from "@/lib/gemini";
import { logConversation } from "@/lib/sheets";

// ElevenLabs POSTs here after every call ends
// Configure this URL in your ElevenLabs agent webhook settings:
// https://your-domain.vercel.app/api/call-webhook

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ElevenLabs webhook payload structure
    const conversationId: string = body.conversation_id ?? body.data?.conversation_id ?? "";
    const status: string = body.status ?? body.data?.status ?? "done";
    const transcript: { role: string; message: string }[] =
      body.transcript ?? body.data?.transcript ?? [];

    // Pull contractor info from dynamic variables if present
    const dynVars = body.conversation_initiation_client_data?.dynamic_variables ?? {};
    const contractorName: string = dynVars.contractor_name ?? "Unknown Contractor";
    const contractorPhone: string = dynVars.contractor_phone ?? "";

    if (!conversationId) {
      return NextResponse.json({ ok: true }); // ignore malformed webhooks
    }

    // ── Summarize transcript with Gemini ──────────────────────────────────
    let summary = "";
    let finalAgreedPrice = "Unknown";

    if (transcript.length > 0) {
      const transcriptText = transcript
        .map((t) => `${t.role === "agent" ? "BidBot" : "Contractor"}: ${t.message}`)
        .join("\n");

      const summaryPrompt = `
You are summarizing a property repair negotiation phone call.

Transcript:
${transcriptText}

Provide a concise summary (2-3 sentences) covering:
1. Whether the contractor agreed to negotiate
2. The final agreed price if any (or "did not negotiate")
3. Any important notes (availability, conditions, etc.)

Also extract the final agreed price as a single number or range like "$195" or "$180-$200".
If no price was agreed, write "No agreement".

Respond ONLY with valid JSON (no markdown):
{
  "summary": "...",
  "finalAgreedPrice": "$195"
}
`;

      try {
        const raw = await askGemini(summaryPrompt);
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        summary = parsed.summary ?? "";
        finalAgreedPrice = parsed.finalAgreedPrice ?? "Unknown";
      } catch {
        summary = "Could not summarize transcript.";
      }
    }

    // ── Log to Google Sheets ──────────────────────────────────────────────
    await logConversation({
      conversationId,
      contractorName,
      contractorPhone,
      status,
      summary,
      transcript: JSON.stringify(transcript),
      finalAgreedPrice,
      pickedUp: transcript.length > 0,
      callDurationSecs: 0,
      attitude: "unknown",
      wasBooked: false,
    });
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("call-webhook error:", e);
    // Always return 200 to ElevenLabs even on error — otherwise they retry
    return NextResponse.json({ ok: true });
  }
}