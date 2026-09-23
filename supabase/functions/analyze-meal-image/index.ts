// Port of POST /api/analyze-meal-image from backend/app/main.py
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { analyzeFoodImage } from "../_shared/analyzeFoodImage.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonResponse({ detail: "File must be an image" }, { status: 400 }, origin);
    }
    if (!file.type || !file.type.startsWith("image/")) {
      return jsonResponse({ detail: "File must be an image" }, { status: 400 }, origin);
    }

    let dietaryRestrictions: string[] = [];
    const rawRestrictions = formData.get("dietaryRestrictions");
    if (typeof rawRestrictions === "string" && rawRestrictions.length > 0) {
      try {
        dietaryRestrictions = JSON.parse(rawRestrictions);
      } catch {
        dietaryRestrictions = [];
      }
    }

    const apiKey = Deno.env.get("GOOGLE_API_KEY") ?? "";
    const imageBytes = await file.arrayBuffer();

    const result = await analyzeFoodImage(apiKey, imageBytes, dietaryRestrictions);

    if (!result.success) {
      return jsonResponse({ detail: result.error }, { status: 500 }, origin);
    }

    return jsonResponse(result.data, { status: 200 }, origin);
  } catch (e) {
    console.log(`[ANALYZE MEAL IMAGE] Error: ${e}`);
    return jsonResponse(
      { detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
      origin,
    );
  }
});
