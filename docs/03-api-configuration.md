# API Configuration

**Estimated time**: 10-15 minutes

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

### Backend Configuration (Supabase Edge Function secrets)

The backend is now Supabase Edge Functions (`supabase/functions/`), not a
FastAPI app with a `.env` file. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are injected automatically by the platform - you only need to set the two
external API keys, via the Supabase CLI:

```bash
supabase secrets set GOOGLE_API_KEY=AIzaSy_your_key_here
supabase secrets set USDA_API_KEY=your_usda_key_here
# Or for testing: supabase secrets set USDA_API_KEY=DEMO_KEY
```

**Important Notes**:
- `GOOGLE_API_KEY` must start with `AIzaSy`
- These are set once per Supabase project and apply to all deployed functions
- Verify what's set (values are hidden) with `supabase secrets list`
- For local development with `supabase functions serve`, put the same keys
  in a `supabase/.env` file (gitignored) instead

### Frontend Configuration

Create `frontend/.env.local` (new file in frontend folder):

```env
# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Edge Functions base URL
VITE_API_URL=http://localhost:54321/functions/v1
```

**Important Notes**:
- File **must** be named `.env.local` (not `.env`)
- All frontend variables **must** have `VITE_` prefix
- Use **anon** key (not service_role key) - safe for public exposure
- `VITE_API_URL` points to your Edge Functions base URL (`supabase functions serve` locally, or `https://[project-ref].supabase.co/functions/v1` in production)
- No quotes around values
- **Restart dev server** after creating or modifying this file

**Verification**:
After creating the file, verify it's loaded:
1. Start frontend dev server: `npm run dev`
2. Open browser console (F12)
3. Type: `console.log(import.meta.env.VITE_SUPABASE_URL)`
4. Should show your Supabase URL (not `undefined`)

**Security Checklist**:
- [ ] File named exactly `.env.local`
- [ ] Located in `frontend/` directory
- [ ] All variables have `VITE_` prefix
- [ ] Using anon key (not service_role key)
- [ ] Listed in `.gitignore`

### Environment Variable Reference

| Variable | Location | Value From | Public? |
|----------|----------|------------|---------|
| `SUPABASE_URL` | Edge Functions | Auto-injected by Supabase | n/a |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Auto-injected by Supabase | n/a |
| `GOOGLE_API_KEY` | Edge Functions (`supabase secrets set`) | Google AI Studio | **No** - Keep secret |
| `USDA_API_KEY` | Edge Functions (`supabase secrets set`) | USDA API Key Signup | No |
| `VITE_SUPABASE_URL` | Frontend | Supabase Project Settings > API | Yes |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase Project Settings > API (anon) | Yes |
| `VITE_API_URL` | Frontend | `https://[project-ref].supabase.co/functions/v1` (prod) | Yes |

Next: [Running the Application](04-running-locally.md)
