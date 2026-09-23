// Port of POST /api/generate-health-tip from backend/app/main.py
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { generateContent } from "../_shared/gemini.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  try {
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return jsonResponse({ detail: "GOOGLE_API_KEY not configured" }, { status: 500 }, origin);
    }

    const prompt = `Generate ONE unique, practical, and actionable health tip.

The tip should be about ONE of these topics (choose randomly):
- Exercise and physical activity
- Hydration and water intake
- Sleep quality and rest
- Nutrition and eating habits
- Stress management and mental health
- Movement breaks and posture
- General wellness habits

REQUIREMENTS:
- Make it specific and actionable (not generic)
- Keep it to 2-3 sentences maximum
- Focus on practical advice people can actually do
- Make it interesting and motivating
- Include specific numbers/targets when relevant (e.g., "8 glasses", "30 minutes", "7-9 hours")

Return ONLY the health tip text, no JSON, no markdown, no extra formatting.`;

    const responseText = await generateContent(apiKey, "gemini-2.5-flash", [{ text: prompt }]);
    const tip = responseText.trim();

    return jsonResponse({ tip }, { status: 200 }, origin);
  } catch (e) {
    console.log(`[HEALTH TIP] Error: ${e}`);
    return jsonResponse(
      { detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
      origin,
    );
  }
});
