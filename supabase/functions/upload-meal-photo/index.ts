// Port of POST /api/upload-meal-photo from backend/app/main.py
// (same underlying analyzeFoodImage logic as analyze-meal-image, called with
// no dietary restrictions, matching the original route's behavior.)
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { analyzeFoodImage } from "../_shared/analyzeFoodImage.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || !file.type || !file.type.startsWith("image/")) {
      return jsonResponse({ detail: "File must be an image" }, { status: 400 }, origin);
    }

    const apiKey = Deno.env.get("GOOGLE_API_KEY") ?? "";
    const imageBytes = await file.arrayBuffer();

    const result = await analyzeFoodImage(apiKey, imageBytes, []);

    if (result.success) {
      return jsonResponse(result.data, { status: 200 }, origin);
    }
    return jsonResponse({ detail: result.error }, { status: 500 }, origin);
  } catch (e) {
    console.log(`[UPLOAD] Error: ${e}`);
    return jsonResponse(
      { detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
      origin,
    );
  }
});
