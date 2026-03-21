// Gemini Vision — used only for the diagnosis step (image + text)
// Falls back to text-only if no image is provided or if Gemini key is missing
// All other AI calls still use Groq via gemini.ts

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function askGeminiVision(
  prompt: string,
  imageBase64?: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini key or no image, fall back to Groq text-only
  if (!apiKey || !imageBase64) {
    const { askGemini } = await import("./gemini");
    return askGemini(prompt);
  }

  const parts: object[] = [{ text: prompt }];

  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: imageBase64,
      },
    });
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
    }),
  });

  if (!res.ok) {
    // Gemini failed — fall back to Groq text-only
    console.warn(`Gemini vision failed (${res.status}), falling back to Groq`);
    const { askGemini } = await import("./gemini");
    return askGemini(prompt);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}