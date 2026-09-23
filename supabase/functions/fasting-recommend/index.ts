// Port of POST /api/fasting/recommend from backend/app/main.py
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { generateContent } from "../_shared/gemini.ts";
import { stripCodeFence } from "../_shared/json.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  const body = await req.json().catch(() => ({}));
  const goals: Record<string, unknown> = body.goals ?? {};
  const currentTime: string = body.current_time ?? new Date().toISOString();

  try {
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return jsonResponse(
        {
          recommended_duration: goals.fasting_duration_hours ?? 16,
          reasoning: `Based on your ${goals.fasting_schedule_type ?? "16:8"} schedule setting.`,
        },
        { status: 200 },
        origin,
      );
    }

    // Extract the wall-clock hour as written in the ISO string (matches
    // Python's datetime.fromisoformat(...).hour, which does NOT convert to
    // UTC - it keeps whatever offset the client sent).
    let currentHour: number;
    const hourMatch = currentTime.match(/T(\d{2}):/);
    if (hourMatch) {
      currentHour = parseInt(hourMatch[1], 10);
    } else {
      currentHour = new Date().getHours();
    }

    const prompt = `Recommend an optimal intermittent fasting duration for a user.

USER CONTEXT:
- Current Time: ${currentHour}:00
- Calorie Goal: ${goals.calories ?? 2000} kcal/day
- Protein Goal: ${goals.protein ?? 150}g/day
- Fasting Schedule Preference: ${goals.fasting_schedule_type ?? "16:8"}
- Preferred Fasting Start Time: ${goals.fasting_start_time ?? "20:00"}

Consider:
1. If it's evening (6pm-10pm), suggest starting tonight
2. If it's morning, suggest when to end current/next fast
3. Common schedules: 12h (beginner), 14h (moderate), 16h (common), 18h (advanced), 20h+ (extended)

Return JSON ONLY:
{"recommended_duration": 16, "reasoning": "Brief 1-sentence explanation"}

Make reasoning personal and encouraging. Duration should be a number between 12-24.`;

    try {
      const responseText = await generateContent(apiKey, "gemini-2.5-flash", [{ text: prompt }]);
      const cleaned = stripCodeFence(responseText);
      const result = JSON.parse(cleaned);
      return jsonResponse(
        {
          recommended_duration: Math.trunc(Number(result.recommended_duration ?? 16)),
          reasoning: result.reasoning ?? "Standard 16:8 intermittent fasting schedule.",
        },
        { status: 200 },
        origin,
      );
    } catch (e) {
      console.log(`[FASTING] Error parsing response: ${e}`);
      return jsonResponse(
        {
          recommended_duration: 16,
          reasoning: `Recommended based on your ${goals.fasting_schedule_type ?? "16:8"} schedule.`,
        },
        { status: 200 },
        origin,
      );
    }
  } catch (e) {
    console.log(`[FASTING] Error: ${e}`);
    return jsonResponse(
      {
        recommended_duration: 16,
        reasoning: "Standard 16-hour fast for optimal metabolic benefits.",
      },
      { status: 200 },
      origin,
    );
  }
});
