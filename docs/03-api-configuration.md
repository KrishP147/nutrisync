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

### Backend Configuration

Create `backend/.env` (new file in backend folder):

```env
# Supabase Configuration
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_KEY=your_anon_key_here

# Google Gemini AI
GOOGLE_API_KEY=AIzaSy_your_key_here

# USDA FoodData Central
USDA_API_KEY=your_usda_key_here
# Or for testing: USDA_API_KEY=DEMO_KEY
```

**Important Notes**:
- **No quotes** around values
- Replace `[your-project-ref]` with your actual Supabase project reference
- `SUPABASE_SERVICE_ROLE_KEY` must be kept **secret** (never commit to git or expose in frontend)
- Use the **service_role** key from Supabase dashboard (not anon key)
- `GOOGLE_API_KEY` must start with `AIzaSy`
- This file should already be in `.gitignore` - verify it's not tracked by git

**Security Checklist**:
- [ ] File named exactly `.env` (not `.env.txt` or `.env.example`)
- [ ] Located in `backend/` directory
- [ ] Listed in `.gitignore`
- [ ] No quotes around any values
- [ ] All keys are from your Supabase Project Settings > API page

### Frontend Configuration

Create `frontend/.env.local` (new file in frontend folder):

```env
# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API
VITE_API_URL=http://localhost:8000
```

**Important Notes**:
- File **must** be named `.env.local` (not `.env`)
- All frontend variables **must** have `VITE_` prefix
- Use **anon** key (not service_role key) - safe for public exposure
- `VITE_API_URL` points to your backend server (localhost for development)
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
| `SUPABASE_URL` | Backend | Supabase Project Settings > API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Supabase Project Settings > API (service_role) | **No** - Keep secret |
| `SUPABASE_KEY` | Backend | Supabase Project Settings > API (anon) | Yes |
| `GOOGLE_API_KEY` | Backend | Google AI Studio | **No** - Keep secret |
| `USDA_API_KEY` | Backend | USDA API Key Signup | No |
| `VITE_SUPABASE_URL` | Frontend | Same as backend SUPABASE_URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Same as backend SUPABASE_KEY | Yes |
| `VITE_API_URL` | Frontend | `http://localhost:8000` (dev) | Yes |

Next: [Running the Application](04-running-locally.md)
