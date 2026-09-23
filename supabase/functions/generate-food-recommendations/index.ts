// Port of POST /api/generate-food-recommendations from backend/app/main.py
//
// Caching note: the original used a Python process-lifetime in-memory dict.
// Here we use a module-scope Map, which behaves the same way *while the Edge
// Function isolate stays warm*, but (unlike a long-running droplet process)
// Supabase may spin up a fresh isolate between invocations, in which case the
// cache is simply empty again. This is a acceptable behavior difference of
// the serverless architecture, not a functional regression - worst case is
// an extra Gemini call instead of a stale/duplicate one.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { generateContent } from "../_shared/gemini.ts";
import { stripCodeFence } from "../_shared/json.ts";

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
  halal: "FORBIDDEN: pork, bacon, ham, alcohol, non-halal meat. ALLOWED: halal chicken, fish, vegetables, fruits",
  kosher: "FORBIDDEN: pork, shellfish, mixing meat/dairy. ALLOWED: kosher-certified foods, fish with scales, vegetables",
  vegetarian: "FORBIDDEN: beef, chicken, fish, pork, turkey, any meat. ALLOWED: eggs, dairy, vegetables, fruits, grains, legumes",
  vegan: "FORBIDDEN: meat, fish, eggs, milk, cheese, butter, honey, any animal product. ALLOWED: vegetables, fruits, grains, legumes, nuts (if not nut-free), plant-based foods only",
  gluten_free: "FORBIDDEN: bread, pasta, wheat, barley, rye, most cereals. ALLOWED: rice, quinoa, gluten-free oats, vegetables, fruits",
  dairy_free: "FORBIDDEN: milk, cheese, butter, yogurt, cream, ice cream. ALLOWED: plant-based milks, dairy-free alternatives, vegetables, fruits",
  nut_free: "FORBIDDEN: peanuts, almonds, walnuts, cashews, nut butters. ALLOWED: seeds (sunflower, pumpkin), vegetables, fruits, grains",
  shellfish_free: "FORBIDDEN: shrimp, crab, lobster, clams, mussels, oysters. ALLOWED: fish (if not vegetarian/vegan), other seafood, vegetables",
  low_sodium: "FORBIDDEN: processed foods, canned soups, fast food, salty snacks. ALLOWED: fresh vegetables, fruits, unsalted foods",
  low_carb: "FORBIDDEN: bread, pasta, rice, potatoes, sugary foods, grains. ALLOWED: meat (if not vegetarian/vegan), vegetables, low-carb fruits",
};

const CACHE_EXPIRY_MS = 1 * 60 * 1000;
const recommendationsCache = new Map<string, { data: unknown; time: number }>();

// Stable (sorted-key) JSON stringify, mirroring Python's json.dumps(sort_keys=True)
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  try {
    const body = await req.json().catch(() => ({}));
    const goals: Record<string, number> = body.goals ?? {};
    const current: Record<string, number> = body.current ?? {};
    const lacking: Record<string, number> = body.lacking ?? {};
    const recType: string = body.type ?? "toEat";
    const dietaryRestrictions: string[] = body.dietaryRestrictions ?? [];
    const forceRefresh: boolean = body.forceRefresh ?? false;

    const currentHour = new Date().getHours();
    const cacheKeyData = {
      goals,
      current,
      type: recType,
      dietaryRestrictions: dietaryRestrictions ? [...dietaryRestrictions].sort() : [],
      hour: currentHour,
    };
    const cacheKey = await sha256Hex(stableStringify(cacheKeyData));

    if (!forceRefresh && recommendationsCache.has(cacheKey)) {
      const cached = recommendationsCache.get(cacheKey)!;
      if (Date.now() - cached.time < CACHE_EXPIRY_MS) {
        console.log(`[CACHE HIT] Returning cached recommendations for key: ${cacheKey.slice(0, 8)}...`);
        return jsonResponse(cached.data, { status: 200 }, origin);
      }
    }

    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return jsonResponse({ detail: "GOOGLE_API_KEY not set" }, { status: 500 }, origin);
    }

    let restrictionsText = "";
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      const activeRules = dietaryRestrictions.map((r) => RESTRICTION_RULES[r]).filter(Boolean);
      const activeExamples = dietaryRestrictions
        .filter((r) => r in RESTRICTION_EXAMPLES)
        .map((r) => RESTRICTION_EXAMPLES[r])
        .filter(Boolean);

      if (activeRules.length > 0) {
        restrictionsText = `

🚫 CRITICAL DIETARY RESTRICTIONS - ABSOLUTE REQUIREMENT:
${activeRules.map((rule) => `• ${rule}`).join("\n")}

EXAMPLES OF WHAT IS FORBIDDEN vs ALLOWED:
${activeExamples.map((ex) => `• ${ex}`).join("\n")}

⚠️ MANDATORY RULES:
1. NEVER suggest any food that violates these restrictions
2. If user is VEGAN, do NOT suggest: meat, fish, eggs, dairy, honey, or any animal product
3. If user is VEGETARIAN, do NOT suggest: any meat, fish, or poultry
4. Double-check every recommendation against ALL active restrictions
5. When in doubt, choose a plant-based, whole food option

VALIDATION: Before suggesting any food, ask yourself: "Does this violate any restriction?" If YES, DO NOT SUGGEST IT.
`;
      }
    }

    const result: Record<string, unknown> = {};

    if (recType === "toEat") {
      const prompt = `Generate EXACTLY 5 food recommendations.

GOALS: Cals ${goals.calories ?? 2000}, Protein ${goals.protein ?? 150}g, Carbs ${goals.carbs ?? 250}g, Fat ${goals.fat ?? 67}g, Fiber ${goals.fiber ?? 28}g
CURRENT: Cals ${current.calories ?? 0}, Protein ${current.protein ?? 0}g, Carbs ${current.carbs ?? 0}g, Fat ${current.fat ?? 0}g, Fiber ${current.fiber ?? 0}g
NEED: Cals ${lacking.calories ?? 0}, Protein ${lacking.protein ?? 0}g, Carbs ${lacking.carbs ?? 0}g, Fat ${lacking.fat ?? 0}g, Fiber ${lacking.fiber ?? 0}g
${restrictionsText}
Return JSON: {"foods": [{"name": "Food Name", "score": 85, "reason": "Brief reason"}]}
Score 60-98. Reason 3-6 words. Be specific. MUST comply with restrictions above.`;

      try {
        const responseText = await generateContent(apiKey, "gemini-2.5-flash", [{ text: prompt }]);
        const cleaned = stripCodeFence(responseText);
        const foodsData = JSON.parse(cleaned);
        result.foodsToEat = (foodsData.foods ?? []).slice(0, 5);
      } catch (e) {
        console.log(`[RECOMMENDATIONS] Error parsing foodsToEat: ${e}`);
        result.foodsToEat = [];
      }
    }

    recommendationsCache.set(cacheKey, { data: result, time: Date.now() });
    console.log(`[CACHE STORE] Cached recommendations for key: ${cacheKey.slice(0, 8)}...`);

    if (recommendationsCache.size > 100) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of recommendationsCache.entries()) {
        if (v.time < oldestTime) {
          oldestTime = v.time;
          oldestKey = k;
        }
      }
      if (oldestKey) recommendationsCache.delete(oldestKey);
    }

    return jsonResponse(result, { status: 200 }, origin);
  } catch (e) {
    console.log(`[RECOMMENDATIONS] Error: ${e}`);
    return jsonResponse(
      { detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
      origin,
    );
  }
});
