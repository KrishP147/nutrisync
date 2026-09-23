// Port of POST /api/recommendations from backend/app/main.py
// Note: the original never raises an HTTP error here - any failure (including
// a missing API key) falls back to a 200 response with a friendly message.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { generateContent } from "../_shared/gemini.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  try {
    const body = await req.json().catch(() => ({}));
    const meals: Record<string, number>[] = body.meals ?? [];
    const goals: Record<string, number> = body.goals ?? {};

    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return jsonResponse(
        { recommendations: "Unable to generate recommendations without API key." },
        { status: 200 },
        origin,
      );
    }

    const totalCalories = meals.reduce((s, m) => s + (m.total_calories ?? 0), 0);
    const totalProtein = meals.reduce((s, m) => s + (m.total_protein_g ?? 0), 0);
    const totalCarbs = meals.reduce((s, m) => s + (m.total_carbs_g ?? 0), 0);
    const totalFat = meals.reduce((s, m) => s + (m.total_fat_g ?? 0), 0);

    const prompt = `Provide nutrition recommendations based on:

Meals consumed: ${meals.length} meals
Total calories: ${totalCalories} kcal
Total protein: ${totalProtein}g
Total carbs: ${totalCarbs}g
Total fat: ${totalFat}g

Goals:
Calories: ${goals.calories ?? 2000} kcal
Protein: ${goals.protein ?? 150}g
Carbs: ${goals.carbs ?? 250}g
Fat: ${goals.fat ?? 65}g

Provide brief recommendations (2-3 sentences).`;

    const responseText = await generateContent(apiKey, "gemini-2.5-flash", [{ text: prompt }]);
    return jsonResponse({ recommendations: responseText }, { status: 200 }, origin);
  } catch (e) {
    console.log(`[RECOMMENDATIONS] Error: ${e}`);
    return jsonResponse(
      { recommendations: "Unable to generate recommendations at this time." },
      { status: 200 },
      origin,
    );
  }
});
