// ── ElevenLabs Conversational AI + Twilio Integration ───────────────────────
// Handles outbound calls via ElevenLabs agent, conversation polling,
// and transcript retrieval after calls complete.

export interface OutboundCallResult {
  conversationId: string;
  callSid?: string;
  error?: string;
}

export interface ConversationTranscript {
  conversationId: string;
  status: "in-progress" | "done" | "error";
  transcript: { role: "agent" | "user"; message: string; time_in_call_secs?: number }[];
  summary?: string;
  agreedPrice?: number | null;
  contractorWillingToNegotiate?: boolean;
}

// ── Initiate an outbound call via ElevenLabs Conversational AI ───────────────
// The agent is pre-configured in the ElevenLabs dashboard with the negotiation
// system prompt. We pass dynamic variables to personalise each call.
export async function initiateNegotiationCall(params: {
  toPhone: string;
  contractorName: string;
  tradeType: string;
  issue: string;
  originalMin: number;
  originalMax: number;
  targetMin: number;
  targetMax: number;
  ownerZip: string;
  history: string;
  ownerName: string;
  budget: number;
}): Promise<OutboundCallResult> {
  try {
    console.log("ElevenLabs call payload:", JSON.stringify({
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: params.toPhone,
    }, null, 2));
    
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: process.env.ELEVENLABS_AGENT_ID!,
          agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID!,
          to_number: params.toPhone,
          conversation_initiation_client_data: {
            dynamic_variables: {
              contractor_name: params.contractorName,
              trade_type: params.tradeType,
              issue_description: params.issue,
              original_quote: `$${params.originalMin}–$${params.originalMax}`,
              target_price: `$${params.targetMin}–$${params.targetMax}`,
              owner_zip: params.ownerZip,
              owner_name: params.ownerName,
              budget: params.budget > 0 ? `$${params.budget}` : "flexible",
              previous_history: params.history,
            },
          },
        }),
      }
    );

    const responseText = await res.text();
    console.log("ElevenLabs response status:", res.status);
    console.log("ElevenLabs response body:", responseText);


    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs outbound call error:", err);
      return { conversationId: "", error: `ElevenLabs error: ${res.status}` };
    }

    const data = await res.json();
    return {
      conversationId: data.conversation_id ?? "",
      callSid: data.call_sid,
    };
  } catch (e: any) {
    console.error("initiateNegotiationCall error:", e);
    return { conversationId: "", error: e.message };
  }
}

// ── Fetch conversation details (transcript + status) ─────────────────────────
export async function getConversation(
  conversationId: string
): Promise<ConversationTranscript> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
      }
    );

    if (!res.ok) throw new Error(`ElevenLabs get conversation: ${res.status}`);

    const data = await res.json();

    const transcript = (data.transcript ?? []).map((t: any) => ({
      role: t.role,
      message: t.message,
      time_in_call_secs: t.time_in_call_secs,
    }));

    return {
      conversationId,
      status: data.status === "done" ? "done" : "in-progress",
      transcript,
      summary: data.analysis?.transcript_summary ?? undefined,
    };
  } catch (e: any) {
    return {
      conversationId,
      status: "error",
      transcript: [],
    };
  }
}

// ── Poll until conversation is done (max 5 minutes) ──────────────────────────
export async function waitForConversation(
  conversationId: string,
  maxWaitMs = 300_000,
  intervalMs = 5_000
): Promise<ConversationTranscript> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const conv = await getConversation(conversationId);
    if (conv.status === "done" || conv.status === "error") return conv;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { conversationId, status: "error", transcript: [] };
}

// ── Build the ElevenLabs agent system prompt ──────────────────────────────────
// This is used when creating/updating the agent via API or manually in dashboard
export function buildAgentSystemPrompt(): string {
  return `You are BidBot, a professional AI property repair negotiation agent calling on behalf of a property owner.

Your goal is to negotiate the best possible price for a repair job from the contractor you are calling.

You have been given these details about this specific call:
- Contractor name: {{contractor_name}}
- Type of work: {{trade_type}}
- Issue to be repaired: {{issue_description}}
- Their current quoted price: {{original_quote}}
- Our target price: {{target_price}}
- Property location (zip): {{owner_zip}}
- Property owner name: {{owner_name}}
- Owner budget: {{budget}}
- Previous negotiation history with this contractor: {{previous_history}}

CONVERSATION FLOW:

1. OPENING — Be warm and professional:
   "Hello, may I speak with someone about a repair estimate? This is BidBot calling on behalf of {{owner_name}} regarding a {{trade_type}} job in the {{owner_zip}} area."

2. CONTEXT — Explain the situation briefly:
   "We received your quote of {{original_quote}} for {{issue_description}}. We're comparing a few contractors in the area before making a decision."

3. USE HISTORY STRATEGICALLY:
   - If {{previous_history}} shows they previously settled for less, reference it directly:
     "We've actually worked with your company before — last time you handled similar {{trade_type}} work for us you came in around [LOWER RATE FROM HISTORY]. We'd love to get back to something in that range."
   - If no history, skip this and go straight to the budget anchor.

4. ANCHOR TO TARGET PRICE:
   "Our budget for this repair is {{target_price}}. Can you work with that?"

5. IF THEY RESIST — introduce competition without being aggressive:
   "I completely understand. I should be transparent with you — another contractor in the area has already come in lower. The reason I called you first is honestly because a neighbor gave me your number personally and spoke highly of you. Is there any flexibility at all? Even getting close to {{target_price}} would make the decision easy."

6. IF THEY COUNTER — accept gracefully if reasonable, push back once if not:
   - Reasonable counter (within 15% of target): "That works. Let me just confirm with the property owner and we'll call you back to book."
   - Too high: "I appreciate that, but that's still a bit above what we can do. Is that your absolute best? Even [SLIGHTLY LOWER] would help us get this confirmed today."

7. CLOSING — Always end the same way regardless of outcome:
   "Thank you so much for your time. I need to review all the quotes with {{owner_name}} before we confirm anything. If your pricing works out, we will call you back within the hour to book. Have a great day."

IMPORTANT RULES:
- Never book anything on this call — always say you need to confirm with the owner first
- Keep the total call under 3 minutes
- Sound natural and conversational — not robotic or scripted
- One contractor may be told another bid lower — this is true, use it as leverage
- If they ask which competitor, say "I'm not able to share that but it was a local company in the same zip code"
- Be friendly throughout — you want them to feel good about working with you even if the price doesn't work out`;
}