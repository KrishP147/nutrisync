from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import hashlib
import json
from pathlib import Path
from app.services.gemini_service import analyze_food_image
import google.generativeai as genai
from datetime import datetime, timedelta

app = FastAPI(title="NutriSync API")

# Simple in-memory cache for recommendations (expires after 1 minute to reduce repetition)
recommendations_cache = {}
CACHE_EXPIRY_MINUTES = 1

# Debug: Log environment variable status on startup
print(f"[STARTUP] GOOGLE_API_KEY present: {bool(os.getenv('GOOGLE_API_KEY'))}")
if os.getenv('GOOGLE_API_KEY'):
    print(f"[STARTUP] API key starts with: {os.getenv('GOOGLE_API_KEY')[:10]}...")
else:
    print("[STARTUP] WARNING: GOOGLE_API_KEY not found in environment!")

# CORS middleware (allow frontend to call backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "NutriSync API is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/list-models")
def list_models():
    """List available Gemini models that support generateContent."""
    try:
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not set")

        genai.configure(api_key=api_key)
        models = []
        for model in genai.list_models():
            if 'generateContent' in model.supported_generation_methods:
                models.append({
                    'name': model.name,
                    'display_name': model.display_name,
                    'description': model.description
                })
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search-food")
async def search_food(query: str):
    """
    Search for foods in USDA FoodData Central database.
    Returns food items with their nutrition information.
    """
    import httpx

    if not query or len(query.strip()) == 0:
        raise HTTPException(status_code=422, detail="Query parameter is required")
    
    if len(query) < 2:
        return {'foods': []}

    # Get API key from environment or use DEMO_KEY as fallback
    usda_api_key = os.getenv('USDA_API_KEY', 'DEMO_KEY')

    # Using USDA FoodData Central API
    try:
        async with httpx.AsyncClient() as client:
            # Search using the free API endpoint
            print(f"[FOOD SEARCH] Searching for: {query}")
            response = await client.get(
                "https://api.nal.usda.gov/fdc/v1/foods/search",
                params={
                    "query": query,
                    "pageSize": 10,
                    "dataType": ["Survey (FNDDS)", "Foundation", "SR Legacy"],
                    "api_key": usda_api_key
                },
                timeout=10.0
            )

            print(f"[FOOD SEARCH] Status: {response.status_code}")

            if response.status_code != 200:
                print(f"[FOOD SEARCH] Error response: {response.text}")
                raise HTTPException(status_code=500, detail="Food database unavailable")

            data = response.json()
            foods = []

            for item in data.get('foods', [])[:10]:
                # Extract nutrition data
                nutrients = {
                    'calories': 0,
                    'protein_g': 0,
                    'carbs_g': 0,
                    'fat_g': 0,
                    'fiber_g': 0
                }

                for nutrient in item.get('foodNutrients', []):
                    nutrient_id = nutrient.get('nutrientId')
                    nutrient_name = nutrient.get('nutrientName', '').lower()
                    value = nutrient.get('value', 0)

                    # Use nutrient IDs for more accurate matching
                    if nutrient_id == 1003 or 'protein' in nutrient_name:
                        nutrients['protein_g'] = value
                    elif nutrient_id == 1005 or 'carbohydrate' in nutrient_name:
                        nutrients['carbs_g'] = value
                    elif nutrient_id == 1004 or 'total lipid' in nutrient_name or 'fat' in nutrient_name:
                        nutrients['fat_g'] = value
                    elif nutrient_id == 1079 or 'fiber' in nutrient_name:
                        nutrients['fiber_g'] = value
                    elif nutrient_id == 1008 or ('energy' in nutrient_name and 'kcal' in nutrient_name.lower()):
                        nutrients['calories'] = value

                foods.append({
                    'name': item.get('description', ''),
                    'fdcId': item.get('fdcId'),
                    'portion': '100g',
                    'calories': int(nutrients.get('calories', 0)),
                    'protein_g': round(nutrients.get('protein_g', 0), 1),
                    'carbs_g': round(nutrients.get('carbs_g', 0), 1),
                    'fat_g': round(nutrients.get('fat_g', 0), 1),
                    'fiber_g': round(nutrients.get('fiber_g', 0), 1),
                })

            print(f"[FOOD SEARCH] Found {len(foods)} foods")
            return {'foods': foods}

    except httpx.TimeoutException:
        print("[FOOD SEARCH] Timeout")
        raise HTTPException(status_code=504, detail="Food search timed out")
    except Exception as e:
        print(f"[FOOD SEARCH] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to search food: {str(e)}")

@app.get("/api/food/{food_id}")
async def get_food_details(food_id: int):
    """
    Get detailed nutrition information for a specific food by FDC ID.
    """
    import httpx
    
    usda_api_key = os.getenv('USDA_API_KEY', 'DEMO_KEY')
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.nal.usda.gov/fdc/v1/food/{food_id}",
                params={"api_key": usda_api_key},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Food database unavailable")
            
            return response.json()
    
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Food details request timed out")
    except Exception as e:
        print(f"[FOOD DETAILS] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-meal-image")
async def analyze_meal_image(
    file: UploadFile = File(...),
    dietaryRestrictions: str = Form(default="[]")
):
    """
    Upload a food image and get AI-powered nutrition analysis.
    Accepts dietary restrictions to warn about violations (Option B: analyze all foods, show warnings).
    """
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Parse dietary restrictions from form data
    import json
    try:
        dietary_restrictions = json.loads(dietaryRestrictions) if dietaryRestrictions else []
    except:
        dietary_restrictions = []

    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1]
    file_path = UPLOAD_DIR / f"{file_id}.{file_extension}"

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Analyze with Gemini (pass dietary restrictions)
    result = await analyze_food_image(str(file_path), dietary_restrictions)

    # Clean up file (optional: keep for debugging)
    # os.remove(file_path)

    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])

    return result['data']

@app.post("/api/chat")
async def chat_with_ai(request: dict):
    """
    Chat with AI nutrition assistant using Gemini.
    Expects: { "message": str, "userGoals": dict, "recentMeals": dict, "dietaryRestrictions": list }
    """
    try:
        message = request.get('message', '')
        user_goals = request.get('userGoals', {})
        recent_meals = request.get('recentMeals', {})
        dietary_restrictions = request.get('dietaryRestrictions', [])

        if not message:
            raise HTTPException(status_code=400, detail="Message is required")

        # Check API key
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")

        # Configure Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Build dietary restrictions string
        restrictions_text = ""
        if dietary_restrictions and len(dietary_restrictions) > 0:
            restriction_rules = {
                'halal': "HALAL: No pork, no alcohol, meat must be halal-certified",
                'kosher': "KOSHER: No pork/shellfish, no mixing meat and dairy, kosher-certified only",
                'vegetarian': "VEGETARIAN: No meat, no fish, no poultry",
                'vegan': "VEGAN: No animal products whatsoever (no meat, dairy, eggs, honey)",
                'gluten_free': "GLUTEN-FREE: No wheat, barley, rye, or gluten-containing foods",
                'dairy_free': "DAIRY-FREE: No milk, cheese, butter, yogurt, or dairy products",
                'nut_free': "NUT-FREE: No peanuts, tree nuts, or nut-derived products",
                'shellfish_free': "SHELLFISH-FREE: No shrimp, crab, lobster, clams, mussels, etc.",
                'low_sodium': "LOW-SODIUM: Avoid high-salt foods and processed foods",
                'low_carb': "LOW-CARB: Minimize carbohydrates, avoid grains and sugars"
            }
            
            restriction_examples = {
                'vegan': "FORBIDDEN: meat, fish, eggs, milk, cheese, butter, honey. ALLOWED: vegetables, fruits, grains, legumes, plant-based foods only",
                'vegetarian': "FORBIDDEN: beef, chicken, fish, pork, any meat. ALLOWED: eggs, dairy, vegetables, fruits, grains",
                'halal': "FORBIDDEN: pork, bacon, alcohol, non-halal meat. ALLOWED: halal chicken, fish, vegetables",
                'kosher': "FORBIDDEN: pork, shellfish, mixing meat/dairy. ALLOWED: kosher-certified foods, fish with scales",
            }

            active_rules = [restriction_rules.get(r, '') for r in dietary_restrictions if r in restriction_rules]
            active_examples = [restriction_examples.get(r, '') for r in dietary_restrictions if r in restriction_examples and r in restriction_examples]
            
            if active_rules:
                examples_text = f"\nEXAMPLES:\n{chr(10).join(f'• {ex}' for ex in active_examples if ex)}\n" if active_examples else ""
                restrictions_text = f"""

🚫 CRITICAL DIETARY RESTRICTIONS:
{chr(10).join(f'• {rule}' for rule in active_rules)}
{examples_text}
⚠️ NEVER recommend foods that violate these restrictions. Double-check every suggestion.
"""

        # Build context
        protein_gap = user_goals.get('protein', 150) - recent_meals.get('avgProtein', 0)
        carbs_gap = user_goals.get('carbs', 250) - recent_meals.get('avgCarbs', 0)
        fat_gap = user_goals.get('fat', 67) - recent_meals.get('avgFat', 0)
        fiber_gap = user_goals.get('fiber', 28) - recent_meals.get('avgFiber', 0)

        context = f"""You are NutriSync AI, a friendly and helpful nutrition assistant.

User's Daily Goals:
- Calories: {user_goals.get('calories', 2000)}
- Protein: {user_goals.get('protein', 150)}g
- Carbs: {user_goals.get('carbs', 250)}g
- Fat: {user_goals.get('fat', 67)}g
- Fiber: {user_goals.get('fiber', 28)}g

Recent 7-Day Average Intake:
- Protein: {recent_meals.get('avgProtein', 0)}g/day (Gap: {protein_gap:+.0f}g)
- Carbs: {recent_meals.get('avgCarbs', 0)}g/day (Gap: {carbs_gap:+.0f}g)
- Fat: {recent_meals.get('avgFat', 0)}g/day (Gap: {fat_gap:+.0f}g)
- Fiber: {recent_meals.get('avgFiber', 0)}g/day (Gap: {fiber_gap:+.0f}g)
{restrictions_text}
CRITICAL FORMATTING RULES:
1. BE EXTREMELY CONCISE - Maximum 2-3 short sentences total
2. Answer only what was asked - no extra information
3. Use ONLY standard punctuation - no asterisks, symbols, or markdown
4. Be direct and actionable
5. Reference their intake gaps when relevant
6. NEVER use asterisks, markdown bold, or special formatting characters

User question: {message}"""

        # Generate response
        response = model.generate_content(context)

        return {
            "response": response.text
        }

    except Exception as e:
        print(f"[CHAT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommendations")
async def get_recommendations(request: dict):
    """
    Generate nutrition recommendations based on meals and goals.
    """
    try:
        meals = request.get('meals', [])
        goals = request.get('goals', {})
        
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            return {"recommendations": "Unable to generate recommendations without API key."}
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Calculate totals
        total_calories = sum(meal.get('total_calories', 0) for meal in meals)
        total_protein = sum(meal.get('total_protein_g', 0) for meal in meals)
        total_carbs = sum(meal.get('total_carbs_g', 0) for meal in meals)
        total_fat = sum(meal.get('total_fat_g', 0) for meal in meals)
        
        prompt = f"""Provide nutrition recommendations based on:
        
Meals consumed: {len(meals)} meals
Total calories: {total_calories} kcal
Total protein: {total_protein}g
Total carbs: {total_carbs}g
Total fat: {total_fat}g

Goals:
Calories: {goals.get('calories', 2000)} kcal
Protein: {goals.get('protein', 150)}g
Carbs: {goals.get('carbs', 250)}g
Fat: {goals.get('fat', 65)}g

Provide brief recommendations (2-3 sentences)."""
        
        response = model.generate_content(prompt)
        return {"recommendations": response.text}
        
    except Exception as e:
        print(f"[RECOMMENDATIONS] Error: {e}")
        return {"recommendations": "Unable to generate recommendations at this time."}

@app.post("/api/generate-food-recommendations")
async def generate_food_recommendations(request: dict):
    """
    Generate personalized food recommendations using Gemini AI.
    Generates foods to eat based on user goals and current intake.
    Respects dietary restrictions (halal, kosher, vegan, etc.)
    Uses caching to avoid unnecessary API calls.
    """
    try:
        goals = request.get('goals', {})
        current = request.get('current', {})
        lacking = request.get('lacking', {})
        rec_type = request.get('type', 'toEat')  # 'toEat' only
        dietary_restrictions = request.get('dietaryRestrictions', [])
        
        # Check if force refresh is requested (bypass cache)
        force_refresh = request.get('forceRefresh', False)
        
        # Create cache key based on request parameters + timestamp (to reduce repetition)
        # Include hour in cache key so recommendations change throughout the day
        current_hour = datetime.now().hour
        cache_key_data = {
            'goals': goals,
            'current': current,
            'type': rec_type,
            'dietaryRestrictions': sorted(dietary_restrictions) if dietary_restrictions else [],
            'hour': current_hour  # Change cache every hour
        }
        cache_key = hashlib.md5(json.dumps(cache_key_data, sort_keys=True).encode()).hexdigest()
        
        # Check cache (skip if force refresh)
        if not force_refresh and cache_key in recommendations_cache:
            cached_data, cached_time = recommendations_cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=CACHE_EXPIRY_MINUTES):
                print(f"[CACHE HIT] Returning cached recommendations for key: {cache_key[:8]}...")
                return cached_data
        
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not set")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Build dietary restrictions string for prompts
        restrictions_text = ""
        restriction_examples = {}
        if dietary_restrictions and len(dietary_restrictions) > 0:
            restriction_rules = {
                'halal': "HALAL: No pork, no alcohol, meat must be halal-certified",
                'kosher': "KOSHER: No pork/shellfish, no mixing meat and dairy, kosher-certified only",
                'vegetarian': "VEGETARIAN: No meat, no fish, no poultry",
                'vegan': "VEGAN: No animal products whatsoever (no meat, dairy, eggs, honey)",
                'gluten_free': "GLUTEN-FREE: No wheat, barley, rye, or gluten-containing foods",
                'dairy_free': "DAIRY-FREE: No milk, cheese, butter, yogurt, or dairy products",
                'nut_free': "NUT-FREE: No peanuts, tree nuts, or nut-derived products",
                'shellfish_free': "SHELLFISH-FREE: No shrimp, crab, lobster, clams, mussels, etc.",
                'low_sodium': "LOW-SODIUM: Avoid high-salt foods and processed foods",
                'low_carb': "LOW-CARB: Minimize carbohydrates, avoid grains and sugars"
            }
            
            restriction_examples = {
                'halal': "FORBIDDEN: pork, bacon, ham, alcohol, non-halal meat. ALLOWED: halal chicken, fish, vegetables, fruits",
                'kosher': "FORBIDDEN: pork, shellfish, mixing meat/dairy. ALLOWED: kosher-certified foods, fish with scales, vegetables",
                'vegetarian': "FORBIDDEN: beef, chicken, fish, pork, turkey, any meat. ALLOWED: eggs, dairy, vegetables, fruits, grains, legumes",
                'vegan': "FORBIDDEN: meat, fish, eggs, milk, cheese, butter, honey, any animal product. ALLOWED: vegetables, fruits, grains, legumes, nuts (if not nut-free), plant-based foods only",
                'gluten_free': "FORBIDDEN: bread, pasta, wheat, barley, rye, most cereals. ALLOWED: rice, quinoa, gluten-free oats, vegetables, fruits",
                'dairy_free': "FORBIDDEN: milk, cheese, butter, yogurt, cream, ice cream. ALLOWED: plant-based milks, dairy-free alternatives, vegetables, fruits",
                'nut_free': "FORBIDDEN: peanuts, almonds, walnuts, cashews, nut butters. ALLOWED: seeds (sunflower, pumpkin), vegetables, fruits, grains",
                'shellfish_free': "FORBIDDEN: shrimp, crab, lobster, clams, mussels, oysters. ALLOWED: fish (if not vegetarian/vegan), other seafood, vegetables",
                'low_sodium': "FORBIDDEN: processed foods, canned soups, fast food, salty snacks. ALLOWED: fresh vegetables, fruits, unsalted foods",
                'low_carb': "FORBIDDEN: bread, pasta, rice, potatoes, sugary foods, grains. ALLOWED: meat (if not vegetarian/vegan), vegetables, low-carb fruits"
            }
            
            active_rules = [restriction_rules.get(r, '') for r in dietary_restrictions if r in restriction_rules]
            active_examples = [restriction_examples.get(r, '') for r in dietary_restrictions if r in restriction_examples]
            
            if active_rules:
                restrictions_text = f"""

🚫 CRITICAL DIETARY RESTRICTIONS - ABSOLUTE REQUIREMENT:
{chr(10).join(f'• {rule}' for rule in active_rules)}

EXAMPLES OF WHAT IS FORBIDDEN vs ALLOWED:
{chr(10).join(f'• {ex}' for ex in active_examples if ex)}

⚠️ MANDATORY RULES:
1. NEVER suggest any food that violates these restrictions
2. If user is VEGAN, do NOT suggest: meat, fish, eggs, dairy, honey, or any animal product
3. If user is VEGETARIAN, do NOT suggest: any meat, fish, or poultry
4. Double-check every recommendation against ALL active restrictions
5. When in doubt, choose a plant-based, whole food option

VALIDATION: Before suggesting any food, ask yourself: "Does this violate any restriction?" If YES, DO NOT SUGGEST IT.
"""

        result = {}

        # Generate "Foods to Eat" recommendations
        if rec_type == 'toEat':
            prompt = f"""Generate EXACTLY 5 food recommendations.

GOALS: Cals {goals.get('calories', 2000)}, Protein {goals.get('protein', 150)}g, Carbs {goals.get('carbs', 250)}g, Fat {goals.get('fat', 67)}g, Fiber {goals.get('fiber', 28)}g
CURRENT: Cals {current.get('calories', 0)}, Protein {current.get('protein', 0)}g, Carbs {current.get('carbs', 0)}g, Fat {current.get('fat', 0)}g, Fiber {current.get('fiber', 0)}g
NEED: Cals {lacking.get('calories', 0)}, Protein {lacking.get('protein', 0)}g, Carbs {lacking.get('carbs', 0)}g, Fat {lacking.get('fat', 0)}g, Fiber {lacking.get('fiber', 0)}g
{restrictions_text}
Return JSON: {{"foods": [{{"name": "Food Name", "score": 85, "reason": "Brief reason"}}]}}
Score 60-98. Reason 3-6 words. Be specific. MUST comply with restrictions above."""

            try:
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Clean markdown if present
                if response_text.startswith('```'):
                    response_text = response_text.split('```')[1]
                    if response_text.startswith('json'):
                        response_text = response_text[4:]
                    response_text = response_text.strip()
                
                foods_data = json.loads(response_text)
                result['foodsToEat'] = foods_data.get('foods', [])[:5]
            except (json.JSONDecodeError, Exception) as e:
                print(f"[RECOMMENDATIONS] Error parsing foodsToEat: {e}")
                if 'response_text' in locals():
                    print(f"[RECOMMENDATIONS] Raw response: {response_text[:200]}")
                result['foodsToEat'] = []


        # Cache the result
        recommendations_cache[cache_key] = (result, datetime.now())
        print(f"[CACHE STORE] Cached recommendations for key: {cache_key[:8]}...")
        
        # Clean old cache entries (keep last 100)
        if len(recommendations_cache) > 100:
            oldest_key = min(recommendations_cache.keys(), 
                           key=lambda k: recommendations_cache[k][1])
            del recommendations_cache[oldest_key]

        return result

    except Exception as e:
        print(f"[RECOMMENDATIONS] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-health-tip")
async def generate_health_tip():
    """
    Generate a random health tip using Gemini AI.
    Tips can be about exercise, water, sleep, nutrition, or general wellness.
    """
    try:
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = """Generate ONE unique, practical, and actionable health tip.

The tip should be about ONE of these topics (choose randomly):
- Exercise and physical activity
- Hydration and water intake
- Sleep quality and rest
- Nutrition and eating habits
- Stress management and mental health
- Movement breaks and posture
- General wellness habits

REQUIREMENTS:
- Make it specific and actionable (not generic)
- Keep it to 2-3 sentences maximum
- Focus on practical advice people can actually do
- Make it interesting and motivating
- Include specific numbers/targets when relevant (e.g., "8 glasses", "30 minutes", "7-9 hours")

Return ONLY the health tip text, no JSON, no markdown, no extra formatting."""

        response = model.generate_content(prompt)
        tip = response.text.strip()

        return {"tip": tip}

    except Exception as e:
        print(f"[HEALTH TIP] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-meal-photo")
async def upload_meal_photo(file: UploadFile = File(...)):
    """
    Upload and analyze a meal photo.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Save file temporarily
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / file.filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Analyze with Gemini
        result = await analyze_food_image(str(file_path))
        
        # Clean up
        try:
            file_path.unlink()
        except:
            pass
        
        if result.get('success'):
            return result.get('data')
        else:
            raise HTTPException(status_code=500, detail=result.get('error'))
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPLOAD] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fasting/recommend")
async def recommend_fasting_duration(request: dict):
    """
    Generate a personalized fasting duration recommendation using Gemini AI.
    Considers user goals, recent meal history, and current time.
    """
    try:
        goals = request.get('goals', {})
        current_time = request.get('current_time', datetime.now().isoformat())
        
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            # Return default if no API key
            return {
                "recommended_duration": goals.get('fasting_duration_hours', 16),
                "reasoning": f"Based on your {goals.get('fasting_schedule_type', '16:8')} schedule setting."
            }

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Parse current time
        try:
            current_dt = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
            current_hour = current_dt.hour
        except:
            current_hour = datetime.now().hour

        prompt = f"""Recommend an optimal intermittent fasting duration for a user.

USER CONTEXT:
- Current Time: {current_hour}:00
- Calorie Goal: {goals.get('calories', 2000)} kcal/day
- Protein Goal: {goals.get('protein', 150)}g/day
- Fasting Schedule Preference: {goals.get('fasting_schedule_type', '16:8')}
- Preferred Fasting Start Time: {goals.get('fasting_start_time', '20:00')}

Consider:
1. If it's evening (6pm-10pm), suggest starting tonight
2. If it's morning, suggest when to end current/next fast
3. Common schedules: 12h (beginner), 14h (moderate), 16h (common), 18h (advanced), 20h+ (extended)

Return JSON ONLY:
{{"recommended_duration": 16, "reasoning": "Brief 1-sentence explanation"}}

Make reasoning personal and encouraging. Duration should be a number between 12-24."""

        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean markdown if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
                response_text = response_text.strip()
            
            result = json.loads(response_text)
            return {
                "recommended_duration": int(result.get('recommended_duration', 16)),
                "reasoning": result.get('reasoning', 'Standard 16:8 intermittent fasting schedule.')
            }
        except (json.JSONDecodeError, Exception) as e:
            print(f"[FASTING] Error parsing response: {e}")
            # Return default on parse error
            return {
                "recommended_duration": 16,
                "reasoning": f"Recommended based on your {goals.get('fasting_schedule_type', '16:8')} schedule."
            }

    except Exception as e:
        print(f"[FASTING] Error: {e}")
        # Return default on any error
        return {
            "recommended_duration": 16,
            "reasoning": "Standard 16-hour fast for optimal metabolic benefits."
        }

@app.post("/api/reminders/smart")
async def get_smart_reminder(request: dict):
    """
    AI-powered smart reminder system that analyzes meal patterns, fasting status,
    and user goals to provide the most important reminder at the moment.

    Request body:
    - currentTime: ISO timestamp of current time
    - isFasting: boolean indicating if user is currently fasting
    - activeFast: object with fasting session data (if active)
    - goals: user's nutrition and fasting goals
    - recentMeals: array of recent meals (last 7 days)
    - todaysMeals: array of meals consumed today
    - fastingHistory: array of recent fasting sessions
    """
    try:
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not set")

        genai.configure(api_key=api_key)

        # Extract data from request
        current_time = request.get('currentTime', datetime.now().isoformat())
        is_fasting = request.get('isFasting', False)
        active_fast = request.get('activeFast')
        goals = request.get('goals', {})
        recent_meals = request.get('recentMeals', [])
        todays_meals = request.get('todaysMeals', [])
        fasting_history = request.get('fastingHistory', [])

        # Parse current time
        now = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
        hour = now.hour

        # Calculate today's nutrition totals
        todays_calories = sum(m.get('total_calories', 0) for m in todays_meals)
        todays_protein = sum(m.get('total_protein_g', 0) for m in todays_meals)
        todays_carbs = sum(m.get('total_carbs_g', 0) for m in todays_meals)
        todays_fat = sum(m.get('total_fat_g', 0) for m in todays_meals)

        # Calculate recent meal patterns
        meal_times = []
        for meal in recent_meals[:20]:  # Last 20 meals
            if meal.get('consumed_at'):
                meal_time = datetime.fromisoformat(meal['consumed_at'].replace('Z', '+00:00'))
                meal_times.append(meal_time.hour + meal_time.minute / 60)

        avg_breakfast_time = sum(t for t in meal_times if 5 <= t <= 11) / max(len([t for t in meal_times if 5 <= t <= 11]), 1)
        avg_lunch_time = sum(t for t in meal_times if 11 <= t <= 15) / max(len([t for t in meal_times if 11 <= t <= 15]), 1)
        avg_dinner_time = sum(t for t in meal_times if 17 <= t <= 22) / max(len([t for t in meal_times if 17 <= t <= 22]), 1)

        # Build context for AI
        context = f"""You are a nutrition AI assistant. Analyze the user's current situation and provide ONE smart reminder - the MOST IMPORTANT thing they should know right now.

Current Time: {now.strftime('%I:%M %p')}
User is currently fasting: {is_fasting}

TODAY'S NUTRITION:
- Calories: {todays_calories:.0f} / {goals.get('calories', 2000)} kcal
- Protein: {todays_protein:.0f}g / {goals.get('protein', 150)}g
- Carbs: {todays_carbs:.0f}g / {goals.get('carbs', 250)}g
- Fat: {todays_fat:.0f}g / {goals.get('fat', 65)}g
- Meals logged today: {len(todays_meals)}

FASTING STATUS:"""

        if is_fasting and active_fast:
            elapsed_seconds = (now - datetime.fromisoformat(active_fast['started_at'].replace('Z', '+00:00'))).total_seconds()
            planned_seconds = active_fast.get('planned_duration_hours', 16) * 3600
            remaining_seconds = max(0, planned_seconds - elapsed_seconds)

            context += f"""
- Currently fasting for {elapsed_seconds / 3600:.1f} hours
- Planned duration: {active_fast.get('planned_duration_hours', 16)} hours
- Time remaining: {remaining_seconds / 3600:.1f} hours
- AI recommended: {active_fast.get('ai_recommended', False)}"""
        else:
            context += f"""
- Not currently fasting
- Fasting enabled in goals: {goals.get('fasting_enabled', False)}
- Preferred schedule: {goals.get('fasting_schedule_type', 'not set')}
- Recent fasting sessions: {len(fasting_history)}"""

        context += f"""

MEAL PATTERNS (from last 7 days):
- Typical breakfast time: {avg_breakfast_time:.1f}:00 ({int((avg_breakfast_time % 1) * 60):02d})
- Typical lunch time: {avg_lunch_time:.1f}:00 ({int((avg_lunch_time % 1) * 60):02d})
- Typical dinner time: {avg_dinner_time:.1f}:00 ({int((avg_dinner_time % 1) * 60):02d})
- Average meals per day: {len(recent_meals) / 7:.1f}

GOALS:
- Fasting enabled: {goals.get('fasting_enabled', False)}
- Meal reminders enabled: {goals.get('meal_reminder_enabled', False)}
- Calorie goal: {goals.get('calories', 2000)} kcal
- Protein goal: {goals.get('protein', 150)}g

Based on this analysis, determine the MOST IMPORTANT reminder right now. Consider:
1. If fasting is active and approaching completion
2. If user hasn't eaten and it's past their typical meal time
3. If they're far behind on any macro (especially protein)
4. If they should start fasting based on their schedule
5. If they need to log more meals today

Return a JSON object with:
{{
    "type": "fasting" | "meal" | "nutrition" | "general",
    "priority": "high" | "medium" | "low",
    "message": "Clear, actionable message (1-2 sentences)",
    "action": "Specific next step to take",
    "details": "Optional additional context",
    "icon": "timer" | "utensils" | "trending" | "alert" | "bell",
    "timestamp": "{current_time}"
}}

Only return the JSON, no other text."""

        print(f"[REMINDERS] Requesting AI reminder for user at {now.strftime('%I:%M %p')}")

        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content(context)

        print(f"[REMINDERS] AI Response received")

        # Parse the response
        try:
            response_text = response.text.strip()
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            reminder_data = json.loads(response_text.strip())
            print(f"[REMINDERS] Parsed reminder: {reminder_data['type']} - {reminder_data['priority']}")
            return reminder_data

        except json.JSONDecodeError as e:
            print(f"[REMINDERS] Error parsing response: {e}")
            # Return fallback reminder
            return get_fallback_reminder(is_fasting, hour, todays_calories, goals)

    except Exception as e:
        print(f"[REMINDERS] Error: {e}")
        # Return fallback reminder on any error
        return get_fallback_reminder(
            request.get('isFasting', False),
            datetime.now().hour,
            sum(m.get('total_calories', 0) for m in request.get('todaysMeals', [])),
            request.get('goals', {})
        )

def get_fallback_reminder(is_fasting, hour, todays_calories, goals):
    """Fallback reminder when AI is unavailable"""

    if is_fasting:
        return {
            "type": "fasting",
            "priority": "high",
            "message": "You're currently fasting. Stay hydrated and focused!",
            "action": "Drink water or herbal tea",
            "icon": "timer",
            "timestamp": datetime.now().isoformat()
        }

    calories_goal = goals.get('calories', 2000)
    calories_remaining = calories_goal - todays_calories

    if calories_remaining > calories_goal * 0.7 and hour >= 11:
        return {
            "type": "nutrition",
            "priority": "high",
            "message": f"You've only consumed {todays_calories:.0f} calories today.",
            "action": "Consider logging a meal soon",
            "icon": "alert",
            "timestamp": datetime.now().isoformat()
        }

    if 6 <= hour < 10:
        return {
            "type": "meal",
            "priority": "medium",
            "message": "Good morning! Time to fuel your day.",
            "action": "Start with a protein-rich breakfast",
            "icon": "utensils",
            "timestamp": datetime.now().isoformat()
        }
    elif 11 <= hour < 14:
        return {
            "type": "meal",
            "priority": "medium",
            "message": "Lunchtime! Keep your energy up.",
            "action": "Log a balanced meal",
            "icon": "utensils",
            "timestamp": datetime.now().isoformat()
        }
    elif 17 <= hour < 20:
        return {
            "type": "meal",
            "priority": "medium",
            "message": "Dinner time approaching.",
            "action": "Plan a nutritious evening meal",
            "icon": "utensils",
            "timestamp": datetime.now().isoformat()
        }

    return {
        "type": "general",
        "priority": "low",
        "message": "You're doing great! Stay consistent.",
        "action": "Keep tracking your meals",
        "icon": "trending",
        "timestamp": datetime.now().isoformat()
    }