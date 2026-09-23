// Port of GET /api/search-food from backend/app/main.py
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");

    if (!query || query.trim().length === 0) {
      return jsonResponse({ detail: "Query parameter is required" }, { status: 422 }, origin);
    }

    if (query.length < 2) {
      return jsonResponse({ foods: [] }, { status: 200 }, origin);
    }

    const usdaApiKey = Deno.env.get("USDA_API_KEY") ?? "DEMO_KEY";

    console.log(`[FOOD SEARCH] Searching for: ${query}`);

    const params = new URLSearchParams();
    params.set("query", query);
    params.set("pageSize", "10");
    params.append("dataType", "Survey (FNDDS)");
    params.append("dataType", "Foundation");
    params.append("dataType", "SR Legacy");
    params.set("api_key", usdaApiKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let usdaRes: Response;
    try {
      usdaRes = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`, {
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        console.log("[FOOD SEARCH] Timeout");
        return jsonResponse({ detail: "Food search timed out" }, { status: 504 }, origin);
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log(`[FOOD SEARCH] Status: ${usdaRes.status}`);

    if (!usdaRes.ok) {
      const errText = await usdaRes.text();
      console.log(`[FOOD SEARCH] Error response: ${errText}`);
      return jsonResponse({ detail: "Food database unavailable" }, { status: 500 }, origin);
    }

    const data = await usdaRes.json();
    const foods: Record<string, unknown>[] = [];

    for (const item of (data.foods ?? []).slice(0, 10)) {
      const nutrients = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

      for (const nutrient of item.foodNutrients ?? []) {
        const nutrientId = nutrient.nutrientId;
        const nutrientName = String(nutrient.nutrientName ?? "").toLowerCase();
        const value = nutrient.value ?? 0;

        if (nutrientId === 1003 || nutrientName.includes("protein")) {
          nutrients.protein_g = value;
        } else if (nutrientId === 1005 || nutrientName.includes("carbohydrate")) {
          nutrients.carbs_g = value;
        } else if (nutrientId === 1004 || nutrientName.includes("total lipid") || nutrientName.includes("fat")) {
          nutrients.fat_g = value;
        } else if (nutrientId === 1079 || nutrientName.includes("fiber")) {
          nutrients.fiber_g = value;
        } else if (nutrientId === 1008 || (nutrientName.includes("energy") && nutrientName.includes("kcal"))) {
          nutrients.calories = value;
        }
      }

      const round1 = (n: number) => Math.round(n * 10) / 10;

      foods.push({
        name: item.description ?? "",
        fdcId: item.fdcId,
        portion: "100g",
        calories: Math.trunc(nutrients.calories || 0),
        protein_g: round1(nutrients.protein_g || 0),
        carbs_g: round1(nutrients.carbs_g || 0),
        fat_g: round1(nutrients.fat_g || 0),
        fiber_g: round1(nutrients.fiber_g || 0),
      });
    }

    console.log(`[FOOD SEARCH] Found ${foods.length} foods`);
    return jsonResponse({ foods }, { status: 200 }, origin);
  } catch (e) {
    console.log(`[FOOD SEARCH] Error: ${e}`);
    return jsonResponse(
      { detail: `Failed to search food: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
      origin,
    );
  }
});
