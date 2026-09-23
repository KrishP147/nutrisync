// Port of POST /api/chat from backend/app/main.py
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { generateContent } from "../_shared/gemini.ts";

const RESTRICTION_RULES: Record<string, string> = {
  halal: "HALAL: No pork, no alcohol, meat must be halal-certified",
  kosher: "KOSHER: No pork/shellfish, no mixing meat and dairy, kosher-certified only",
  vegetarian: "VEGETARIAN: No meat, no fish, no poultry",
  vegan: "VEGAN: No animal products whatsoever (no meat, dairy, eggs, honey)",
  gluten_free: "GLUTEN-FREE: No wheat, barley, rye, or gluten-containing foods",
  dairy_free: "DAIRY-FREE: No milk, cheese, butter, yogurt, or dairy products",
  nut_free: "NUT-FREE: No peanuts, tree nuts, or nut-derived products",
  shellfish_free: "SHELLFISH-FREE: No shrimp, crab, lobster, clams, mussels, etc.",
  low_sodium: "LOW-SODIUM: Avoid high-salt foods and processed foods",
  low_carb: "LOW-CARB: Minimize carbohydrates, avoid grains and sugars",
};

const RESTRICTION_EXAMPLES: Record<string, string> = {
  vegan: "FORBIDDEN: meat, fish, eggs, milk, cheese, butter, honey. ALLOWED: vegetables, fruits, grains, legumes, plant-based foods only",
  vegetarian: "FORBIDDEN: beef, chicken, fish, pork, any meat. ALLOWED: eggs, dairy, vegetables, fruits, grains",
  halal: "FORBIDDEN: pork, bacon, alcohol, non-halal meat. ALLOWED: halal chicken, fish, vegetables",
  kosher: "FORBIDDEN: pork, shellfish, mixing meat/dairy. ALLOWED: kosher-certified foods, fish with scales",
};

function signed0(n: number): string {
  const r = Math.round(n);
  return (r >= 0 ? "+" : "") + r.toString();
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  try {
    const body = await req.json().catch(() => ({}));
    const message: string = body.message ?? "";
    const userGoals: Record<string, number> = body.userGoals ?? {};
    const recentMeals: Record<string, number> = body.recentMeals ?? {};
    const dietaryRestrictions: string[] = body.dietaryRestrictions ?? [];

    if (!message) {
      return jsonResponse({ detail: "Message is required" }, { status: 400 }, origin);
    }

    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return jsonResponse({ detail: "GOOGLE_API_KEY not configured" }, { status: 500 }, origin);
    }

    let restrictionsText = "";
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      const activeRules = dietaryRestrictions.map((r) => RESTRICTION_RULES[r]).filter(Boolean);
      const activeExamples = dietaryRestrictions
        .filter((r) => r in RESTRICTION_EXAMPLES)
        .map((r) => RESTRICTION_EXAMPLES[r])
        .filter(Boolean);

      if (activeRules.length > 0) {
        const examplesText = activeExamples.length > 0
          ? `\nEXAMPLES:\n${activeExamples.map((ex) => `• ${ex}`).join("\n")}\n`
          : "";
        restrictionsText = `

🚫 CRITICAL DIETARY RESTRICTIONS:
${activeRules.map((rule) => `• ${rule}`).join("\n")}
${examplesText}
⚠️ NEVER recommend foods that violate these restrictions. Double-check every suggestion.
`;
      }
    }

    const proteinGap = (userGoals.protein ?? 150) - (recentMeals.avgProtein ?? 0);
    const carbsGap = (userGoals.carbs ?? 250) - (recentMeals.avgCarbs ?? 0);
    const fatGap = (userGoals.fat ?? 67) - (recentMeals.avgFat ?? 0);
    const fiberGap = (userGoals.fiber ?? 28) - (recentMeals.avgFiber ?? 0);

    const context = `You are NutriSync AI, a friendly and helpful nutrition assistant.

User's Daily Goals:
- Calories: ${userGoals.calories ?? 2000}
- Protein: ${userGoals.protein ?? 150}g
- Carbs: ${userGoals.carbs ?? 250}g
- Fat: ${userGoals.fat ?? 67}g
- Fiber: ${userGoals.fiber ?? 28}g

Recent 7-Day Average Intake:
- Protein: ${recentMeals.avgProtein ?? 0}g/day (Gap: ${signed0(proteinGap)}g)
- Carbs: ${recentMeals.avgCarbs ?? 0}g/day (Gap: ${signed0(carbsGap)}g)
- Fat: ${recentMeals.avgFat ?? 0}g/day (Gap: ${signed0(fatGap)}g)
- Fiber: ${recentMeals.avgFiber ?? 0}g/day (Gap: ${signed0(fiberGap)}g)
${restrictionsText}
CRITICAL FORMATTING RULES:
1. BE EXTREMELY CONCISE - Maximum 2-3 short sentences total
2. Answer only what was asked - no extra information
3. Use ONLY standard punctuation - no asterisks, symbols, or markdown
4. Be direct and actionable
5. Reference their intake gaps when relevant
6. NEVER use asterisks, markdown bold, or special formatting characters

User question: ${message}`;

    const responseText = await generateContent(apiKey, "gemini-2.5-flash", [{ text: context }]);

    return jsonResponse({ response: responseText }, { status: 200 }, origin);
  } catch (e) {
    console.log(`[CHAT] Error: ${e}`);
    return jsonResponse(
      { detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
      origin,
    );
  }
});
