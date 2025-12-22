import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path
from pathlib import Path

# Load .env from project root (for local development)
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
# Load .env from project root (for local development)
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configure Gemini
api_key = os.getenv('GOOGLE_API_KEY')
if api_key:
    genai.configure(api_key=api_key)
api_key = os.getenv('GOOGLE_API_KEY')
if api_key:
    genai.configure(api_key=api_key)

def analyze_food_image(image_path: str, dietary_restrictions: list = None) -> dict:
    """
    Analyze a food image using Gemini Vision and return nutrition data.

    Args:
        image_path: Path to the image file
        dietary_restrictions: List of dietary restrictions (e.g., ['vegan', 'gluten_free'])

    Returns:
        dict: Parsed nutrition data with foods, totals, and recommendations
    """
    try:
        # Check if API key is configured
        if not os.getenv('GOOGLE_API_KEY'):
            return {
                'success': False,
                'error': 'GOOGLE_API_KEY environment variable is not set'
            }

        model = genai.GenerativeModel('gemini-2.5-flash')

        # Read image
        with open(image_path, 'rb') as f:
            image_data = f.read()

        # Build dietary restrictions warning (Option B: analyze all, but warn)
        restrictions_warning = ""
        if dietary_restrictions and len(dietary_restrictions) > 0:
            restriction_details = {
                'halal': 'pork or alcohol',
                'kosher': 'pork, shellfish, or non-kosher ingredients',
                'vegetarian': 'meat, fish, or poultry',
                'vegan': 'any animal products (meat, dairy, eggs, honey)',
                'gluten_free': 'wheat, barley, rye, or gluten',
                'dairy_free': 'milk, cheese, butter, yogurt, or dairy',
                'nut_free': 'peanuts, tree nuts, or nut derivatives',
                'shellfish_free': 'shrimp, crab, lobster, or shellfish',
                'low_sodium': 'high sodium content',
                'low_carb': 'high carbohydrate content'
            }

            active_restrictions = [r for r in dietary_restrictions if r in restriction_details]
            if active_restrictions:
                restrictions_list = ', '.join([r.upper().replace('_', ' ') for r in active_restrictions])
                restrictions_warning = f"""

        DIETARY RESTRICTIONS ALERT:
        The user has the following dietary restrictions: {restrictions_list}

        In your "recommendations" field, ADD WARNINGS if any identified foods violate these restrictions.
        For each violation, use this format at the START of your recommendations:
        "Warning: [Food name] contains [ingredient] which violates your [restriction] restriction."

        IMPORTANT: STILL ANALYZE ALL FOODS - do not refuse to analyze or omit foods. Just add warnings in the recommendations field.
        """

        prompt = f"""
        Analyze this food image and return ONLY a JSON object (no markdown, no code blocks) with this exact structure:
        {{
          "foods": [
            {{
              "name": "food name",
              "portion": "estimated portion size (e.g., '100g', '1 cup', '1 medium')",
              "calories": estimated_calories_as_integer,
              "protein_g": estimated_protein_as_float,
              "carbs_g": estimated_carbs_as_float,
              "fat_g": estimated_fat_as_float,
              "fiber_g": estimated_fiber_as_float,
              "confidence": confidence_score_0_to_1
            }}
          ],
          "total_nutrition": {{
            "calories": sum_of_all_calories,
            "protein_g": sum_of_all_protein,
            "carbs_g": sum_of_all_carbs,
            "fat_g": sum_of_all_fat,
            "fiber_g": sum_of_all_fiber
          }},
          "meal_type": "breakfast" or "lunch" or "dinner" or "snack",
          "recommendations": "brief nutrition insight (1-2 sentences)"
        }}

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
{restrictions_warning}
        Be specific and realistic about portion sizes based on what you see in the image. If you can't identify a food clearly, estimate conservatively and set confidence lower.
        """
        
        # Generate content
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data}])
        
        # Parse response
        response_text = response.text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]  # Remove ```json
        if response_text.startswith('```'):
            response_text = response_text[3:]  # Remove ```
        if response_text.endswith('```'):
            response_text = response_text[:-3]  # Remove trailing ```

        response_text = response_text.strip()

        # Additional cleaning: remove any trailing commas before closing braces/brackets
        import re
        response_text = re.sub(r',(\s*[}\]])', r'\1', response_text)
        
        # Remove any comments (// or /* */)
        response_text = re.sub(r'//.*?$', '', response_text, flags=re.MULTILINE)
        response_text = re.sub(r'/\*.*?\*/', '', response_text, flags=re.DOTALL)

        # Try to parse JSON
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError as e:
            # If parsing fails, try to extract JSON from the response
            print(f"[GEMINI] First parse attempt failed: {e}")
            print(f"[GEMINI] Attempting to extract JSON...")
            
            # Try to find JSON object in the response
            match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if match:
                response_text = match.group(0)
                response_text = re.sub(r',(\s*[}\]])', r'\1', response_text)
                result = json.loads(response_text)
            else:
                raise
        
        return {
            'success': True,
            'data': result
        }
        
    except json.JSONDecodeError as e:
        raw_text = response.text if 'response' in locals() else response_text if 'response_text' in locals() else None
        print(f"[GEMINI] JSON Parse Error: {e}")
        print(f"[GEMINI] Raw response: {raw_text}")
        return {
            'success': False,
            'error': f'Failed to parse AI response: {str(e)}',
            'raw_response': raw_text
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Failed to analyze image: {str(e)}'
        }