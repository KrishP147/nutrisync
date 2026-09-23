// Thin REST wrapper around the Gemini generateContent API, replacing the
// google-generativeai Python SDK used by the old FastAPI backend. Deno's
// built-in fetch is sufficient; no SDK needed.

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export async function generateContent(
  apiKey: string,
  model: string,
  parts: GeminiPart[],
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Gemini API returned no text content");
  }
  return text;
}
