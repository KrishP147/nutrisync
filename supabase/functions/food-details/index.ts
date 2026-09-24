// Port of GET /api/food/{food_id} from backend/app/main.py
// Called as GET /functions/v1/food-details/<food_id>
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { lastPathSegment } from "../_shared/json.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  try {
    const foodId = lastPathSegment(req);
    if (!foodId || Number.isNaN(Number(foodId))) {
      return jsonResponse({ detail: "food_id must be provided as a path segment" }, { status: 422 }, origin);
    }

    const envKey = Deno.env.get("USDA_API_KEY");
    if (!envKey) console.warn("[FOOD DETAILS] USDA_API_KEY not set, falling back to DEMO_KEY (heavily rate-limited)");
    const usdaApiKey = envKey ?? "DEMO_KEY";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let usdaRes: Response;
    try {
      usdaRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(foodId)}?api_key=${usdaApiKey}`,
        { signal: controller.signal },
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return jsonResponse({ detail: "Food details request timed out" }, { status: 504 }, origin);
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    if (usdaRes.status === 429) {
      return jsonResponse({ detail: "Food database rate-limited, try again shortly" }, { status: 503 }, origin);
    }

    if (!usdaRes.ok) {
      return jsonResponse({ detail: "Food database unavailable" }, { status: 500 }, origin);
    }

    const data = await usdaRes.json();
    return jsonResponse(data, { status: 200 }, origin);
  } catch (e) {
    console.log(`[FOOD DETAILS] Error: ${e}`);
    return jsonResponse(
      { detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
      origin,
    );
  }
});
