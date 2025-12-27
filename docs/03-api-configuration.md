# API Configuration

Configure external APIs required for NutriSync features.

## Google Gemini AI

Required for food image analysis, AI chat, and nutrition recommendations.

### Get API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Select **Create API key in new project**
4. Copy the API key (starts with `AIzaSy...`)

### Rate Limits

Free tier includes:
- 60 requests per minute
- 1,500 requests per day

Sufficient for development and small-scale usage.

## USDA FoodData Central

Required for food database search (400,000+ foods with nutrition data).

### Get API Key

1. Go to [fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html)
2. Fill in the form:
   - **Organization**: Personal Project (or your organization)
   - **Purpose**: Nutrition tracking application
3. Submit and check email for API key

### Alternative for Testing

Use `DEMO_KEY` instead of registering:
- Limited to 30 requests per hour
- Suitable for initial development only

## Configure Environment Variables

### Backend Configuration

Create `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_KEY=your_anon_key

# Google Gemini AI
GOOGLE_API_KEY=your_gemini_api_key

# USDA FoodData Central
USDA_API_KEY=your_usda_key
# Or for testing: USDA_API_KEY=DEMO_KEY
```

**Important**:
- No quotes around values
- `SUPABASE_SERVICE_ROLE_KEY` must be kept secret (never commit or expose in frontend)
- Use the service_role key from Supabase dashboard (not anon key)

### Frontend Configuration

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

**Important**:
- All frontend variables must have `VITE_` prefix
- Use anon key (not service_role key)
- `VITE_API_URL` points to your backend server

Next: [Running the Application](04-running-locally.md)
