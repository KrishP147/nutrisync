// Faithful port of backend/app/services/gemini_service.py:analyze_food_image
import { generateContent } from "./gemini.ts";

export interface AnalyzeResult {
  success: boolean;
  data?: unknown;
  error?: string;
  raw_response?: string | null;
}

const RESTRICTION_DETAILS: Record<string, string> = {
  halal: "pork or alcohol",
  kosher: "pork, shellfish, or non-kosher ingredients",
  vegetarian: "meat, fish, or poultry",
  vegan: "any animal products (meat, dairy, eggs, honey)",
  gluten_free: "wheat, barley, rye, or gluten",
  dairy_free: "milk, cheese, butter, yogurt, or dairy",
  nut_free: "peanuts, tree nuts, or nut derivatives",
  shellfish_free: "shrimp, crab, lobster, or shellfish",
  low_sodium: "high sodium content",
  low_carb: "high carbohydrate content",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function analyzeFoodImage(
  apiKey: string,
  imageBytes: ArrayBuffer,
  dietaryRestrictions: string[] = [],
): Promise<AnalyzeResult> {
  if (!apiKey) {
    return { success: false, error: "GOOGLE_API_KEY environment variable is not set" };
  }

  let responseText: string | undefined;

  try {
    // Build dietary restrictions warning (Option B: analyze all, but warn)
    let restrictionsWarning = "";
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      const activeRestrictions = dietaryRestrictions.filter((r) => r in RESTRICTION_DETAILS);
      if (activeRestrictions.length > 0) {
        const restrictionsList = activeRestrictions
          .map((r) => r.toUpperCase().replace(/_/g, " "))
          .join(", ");
        restrictionsWarning = `

        DIETARY RESTRICTIONS ALERT:
        The user has the following dietary restrictions: ${restrictionsList}

        In your "recommendations" field, ADD WARNINGS if any identified foods violate these restrictions.
        For each violation, use this format at the START of your recommendations:
        "Warning: [Food name] contains [ingredient] which violates your [restriction] restriction."

        IMPORTANT: STILL ANALYZE ALL FOODS - do not refuse to analyze or omit foods. Just add warnings in the recommendations field.
        `;
      }
    }

    const prompt = `
        Analyze this food image and return ONLY a JSON object (no markdown, no code blocks) with this exact structure:
        {
          "foods": [
            {
              "name": "food name",
              "portion": "estimated portion size (e.g., '100g', '1 cup', '1 medium')",
              "calories": estimated_calories_as_integer,
              "protein_g": estimated_protein_as_float,
              "carbs_g": estimated_carbs_as_float,
              "fat_g": estimated_fat_as_float,
              "fiber_g": estimated_fiber_as_float,
              "confidence": confidence_score_0_to_1
            }
          ],
          "total_nutrition": {
            "calories": sum_of_all_calories,
            "protein_g": sum_of_all_protein,
            "carbs_g": sum_of_all_carbs,
            "fat_g": sum_of_all_fat,
            "fiber_g": sum_of_all_fiber
          },
          "meal_type": "breakfast" or "lunch" or "dinner" or "snack",
          "recommendations": "brief nutrition insight (1-2 sentences)"
        }

        IMPORTANT PORTION SIZE GUIDELINES:
        - For packaged items (cans, bottles, slices), estimate the ACTUAL weight/volume, not just 100g
          * Can of Coke: use 355ml (12 fl oz) or 330ml standard
          * Slice of cheese: use realistic weight (20-30g per slice)
          * Protein bar: use package weight shown or typical weight (40-60g)
        - For whole fruits/vegetables, estimate realistic sizes
          * Small apple: 150g, Medium: 200g, Large: 250g
          * Banana: 120g, Orange: 130g
        - For cooked foods, estimate actual plated portion
          * Chicken breast: 150-200g cooked
          * Rice (cooked): 150-200g per serving
          * Pasta (cooked): 200-250g per serving
        - Only default to 100g if you genuinely cannot determine the portion size
${restrictionsWarning}
        Be specific and realistic about portion sizes based on what you see in the image. If you can't identify a food clearly, estimate conservatively and set confidence lower.
        `;

    const base64Data = arrayBufferToBase64(imageBytes);

    responseText = await generateContent(apiKey, "gemini-2.5-flash", [
      { text: prompt },
      { inlineData: { mimeType: "image/jpeg", data: base64Data } },
    ]);

    responseText = responseText.trim();

    // Remove markdown code blocks if present
    if (responseText.startsWith("```json")) {
      responseText = responseText.slice(7);
    }
    if (responseText.startsWith("```")) {
      responseText = responseText.slice(3);
    }
    if (responseText.endsWith("```")) {
      responseText = responseText.slice(0, -3);
    }
    responseText = responseText.trim();

    // Additional cleaning: remove any trailing commas before closing braces/brackets
    responseText = responseText.replace(/,(\s*[}\]])/g, "$1");

    // Remove any comments (// or /* */)
    responseText = responseText.replace(/\/\/.*$/gm, "");
    responseText = responseText.replace(/\/\*[\s\S]*?\*\//g, "");

    let result: unknown;
    try {
      result = JSON.parse(responseText);
    } catch (_e) {
      console.log("[GEMINI] First parse attempt failed, attempting to extract JSON...");
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        let extracted = match[0];
        extracted = extracted.replace(/,(\s*[}\]])/g, "$1");
        result = JSON.parse(extracted);
      } else {
        throw _e;
      }
    }

    return { success: true, data: result };
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.log(`[GEMINI] JSON Parse Error: ${e.message}`);
      console.log(`[GEMINI] Raw response: ${responseText}`);
      return {
        success: false,
        error: `Failed to parse AI response: ${e.message}`,
        raw_response: responseText ?? null,
      };
    }
    return { success: false, error: `Failed to analyze image: ${e instanceof Error ? e.message : String(e)}` };
  }
}
