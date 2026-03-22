# ⚒️ BidBot — AI Property Repair Agent

> **Fix it fast. Pay the least.**

BidBot is an AI-powered repair negotiation agent for homeowners. Describe your repair issue, upload a photo, and BidBot deploys a swarm of ElevenLabs AI voice agents to call every local contractor simultaneously — negotiating the best price in real time.

Built at **HackHayward 2026** by Sahil Dadhwal.

🌐 **Live:** [bidbot-498269685325.us-west1.run.app](https://bidbot-498269685325.us-west1.run.app)

---

## The Problem

83% of homeowners faced unexpected home repairs in 2024. 60% are putting off necessary repairs right now because of cost. Nobody negotiates for them — they just pay whatever they're quoted.

BidBot fixes that.

---

## How It Works

1. **Describe the issue** — type, speak via mic, or upload a photo
2. **AI diagnoses** — Gemini Vision analyzes the photo, Groq identifies the trade type, urgency, risk score, and cost estimate
3. **Find contractors** — Perplexity Sonar searches the web for real local contractors near your zip code
4. **Deploy the swarm** — ElevenLabs AI agents call every contractor simultaneously via Twilio, negotiating based on their quote history stored in Google Sheets
5. **Book the winner** — results come back in real time, book the cheapest contractor with one tap

---

## Tech Stack

| Service | Role |
|---|---|
| **Gemini Vision** | Multimodal photo diagnosis |
| **Groq / LLaMA 3.3** | Clarifying questions, estimates, negotiation simulation, transcript summarization |
| **Perplexity Sonar** | Live web search for real local contractors |
| **ElevenLabs** | Conversational AI voice agent conducts live phone negotiations |
| **Twilio** | Phone infrastructure for outbound calls |
| **Google Sheets** | Logs all negotiations, builds contractor price history profiles |
| **Next.js 14** | Frontend + API routes |
| **Google Cloud Run** | Deployment |

---

## Features

- 📷 **Multimodal input** — text, voice (Web Speech API), or photo upload
- 🔍 **AI diagnosis** — trade type, urgency level, risk score 1–10, cost estimate
- 📞 **Negotiation swarm** — all contractors called simultaneously, not one at a time
- 🧠 **Contractor memory** — Google Sheets logs every negotiation; the agent references past rates mid-call
- 📊 **Contractor profiles** — tracks pickup rate, attitude score, times booked, average savings per contractor over time
- ⚡ **Real-time results** — swarm cards resolve one by one as calls complete

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main UI
│   ├── globals.css
│   └── api/
│       ├── questions/route.ts      # Groq: generates 2 clarifying questions
│       ├── diagnose/route.ts       # Gemini Vision + Groq: diagnosis
│       ├── shops/route.ts          # Perplexity: find local contractors
│       ├── negotiate/route.ts      # ElevenLabs: trigger call swarm
│       ├── conversation/route.ts   # Poll ElevenLabs conversation status
│       ├── call-webhook/route.ts   # Receive post-call transcript from ElevenLabs
│       └── sheets/route.ts         # Google Sheets logging
└── lib/
    ├── gemini.ts                   # Groq client (named gemini for compatibility)
    ├── gemini-vision.ts            # Gemini Vision client for photo analysis
    ├── voice.ts                    # ElevenLabs Conversational AI + agent prompt
    ├── sheets.ts                   # Google Sheets read/write (6 tabs)
    └── types.ts                    # TypeScript interfaces
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Required
GROQ_API_KEY=          # console.groq.com — free
GEMINI_API_KEY=        # aistudio.google.com — free, for photo diagnosis

# Optional — contractor search (falls back to Groq if not set)
PERPLEXITY_API_KEY=    # perplexity.ai/settings/api

# Optional — live phone calls
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_PHONE_NUMBER_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
DEMO_PHONE=            # your number for demo calls

# Optional — Google Sheets logging
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

---

## Getting Started

```bash
npm install
cp .env.example .env.local
# fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## ElevenLabs Agent Setup

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to **Deploy → Agents** → create a new agent
3. Paste the system prompt from `src/lib/voice.ts` → `buildAgentSystemPrompt()`
4. Go to **Deploy → Phone Numbers** → import your Twilio number
5. Copy the Agent ID and Phone Number ID into `.env.local`
6. Set post-call webhook: `https://your-domain/api/call-webhook`

---

## Google Sheets Setup

Create a Google Sheet with these 6 tabs:

| Tab | Contents |
|---|---|
| Submissions | Every user form submission |
| Diagnoses | AI diagnosis results |
| Contractors | All contractors found per search |
| Negotiations | Every negotiation outcome |
| Conversations | Call transcripts + summaries |
| ContractorProfiles | Aggregated contractor behavior over time |

Create a Service Account in Google Cloud Console, enable the Sheets API, share your sheet with the service account email, and paste the credentials into `.env.local`.

---

## Deploy to Google Cloud Run

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

gcloud run deploy bidbot \
  --source . \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi
```

Set environment variables in the Cloud Run console after deployment.

---

## Built With

- [Next.js](https://nextjs.org)
- [ElevenLabs Conversational AI](https://elevenlabs.io)
- [Groq](https://console.groq.com)
- [Google Gemini](https://aistudio.google.com)
- [Perplexity Sonar](https://perplexity.ai)
- [Twilio](https://twilio.com)
- [Google Cloud Run](https://cloud.google.com/run)
- [Google Sheets API](https://developers.google.com/sheets)

---
