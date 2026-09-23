# Running Locally

**Estimated time**: 10-15 minutes

**Important**: You need TWO terminal windows running simultaneously - one for backend, one for frontend.

## Backend Setup

The backend is Supabase Edge Functions (Deno/TypeScript), run locally through
the Supabase CLI - there's no Python virtual environment anymore.

### Install the Supabase CLI

See https://supabase.com/docs/guides/cli/getting-started for your platform.

### Set local secrets

Create `supabase/.env` (gitignored) with your API keys:
```env
GOOGLE_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_key
```

### Start the Edge Functions server

```bash
supabase functions serve --env-file supabase/.env
```

You should see each function listed as served, e.g.:
```
Serving functions on http://127.0.0.1:54321/functions/v1/<function-name>
```

**Server URLs**:
- Functions: `http://localhost:54321/functions/v1/<function-name>`

### Verify Backend

**Test an endpoint** (open a new terminal):
```bash
curl "http://localhost:54321/functions/v1/search-food?query=apple"
```

**Expected response**: a JSON object with a `foods` array.

## Frontend Setup

**Important**: Keep the backend terminal running. Open a NEW terminal window for the frontend.

### Install Dependencies

```bash
cd frontend
npm install
```

This will install all Node.js packages (~1-2 minutes).

### Start Development Server

```bash
npm run dev
```

You should see output like:
```
VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Application URL**: `http://localhost:5173`

### Verify Frontend

1. Open `http://localhost:5173` in your browser
2. You should see the NutriSync login/signup page
3. Check browser console (F12) for any errors

## Test the Application

### Create Account

1. Navigate to `http://localhost:5173` in your browser
2. Click **Sign Up** (or **Register**)
3. Enter email and password
4. Check email for confirmation link (check spam folder)
   - For development, you can disable email confirmation in Supabase
5. Log in with your credentials
6. **Complete profile setup**:
   - Age, gender, height, weight
   - Activity level
   - Weight goals
   - Nutrition goals (calories, protein, carbs, fat, fiber)
   - Dietary restrictions (optional)

### Test Core Features

**Manual Meal Logging**:
1. Navigate to **Log Meals** or **Add Meal**
2. Search for a food (try "chicken breast" or "apple")
3. Adjust serving size as needed
4. Click **Add to meal**
5. Submit the meal
6. Verify it appears in your meal history

**AI Food Recognition** (requires Gemini API key):
1. Navigate to **Add Meal** or **AI Upload**
2. Click to upload or drag-and-drop a food photo
   - Supported formats: JPG, PNG, HEIC
   - Max size: 10MB
3. Wait for AI analysis (5-10 seconds)
4. Verify AI identifies foods correctly
5. Review and edit nutrition estimates if needed
6. Save the meal

**Dashboard**:
1. Navigate to **Dashboard** or **Home**
2. Check that nutrition summary shows your meal data
3. Verify progress charts display correctly
4. Check that meals appear in meal history
5. Test date navigation (if available)

**Profile & Goals**:
1. Navigate to **Profile** or **Settings**
2. Try updating your goals
3. Verify changes are saved

**Fasting Tracker** (if using fasting features):
1. Navigate to **Fasting** tab
2. Start a fasting session
3. Verify timer is working
4. End session and check it's logged

## Troubleshooting

### Backend (Edge Functions) won't start

**Check local secrets file**:
```bash
# Verify supabase/.env exists with GOOGLE_API_KEY and USDA_API_KEY
ls supabase/.env  # macOS/Linux
dir supabase\.env  # Windows
```

**Common issues**:
- Missing API keys in `supabase/.env`
- Supabase CLI not installed or out of date (`supabase --version`)
- Docker not running (the CLI's local emulator needs it)
- Port 54321 already in use - stop other `supabase functions serve` instances

**Check the CLI's terminal output** for specific error messages per function.

### Frontend won't start

**Verify configuration**:
```bash
# Check .env.local exists
ls frontend/.env.local  # macOS/Linux
dir frontend\.env.local  # Windows
```

**Common issues**:
- Missing `.env.local` file in frontend directory
- Variables not prefixed with `VITE_`
- `supabase functions serve` not running (must be started first)
- Incorrect `VITE_API_URL` (should be `http://localhost:54321/functions/v1`)
- Port 5173 already in use - Vite will try 5174 automatically

**After creating/modifying `.env.local`**: Restart the dev server (Ctrl+C, then `npm run dev` again).

### Can't log in / Sign up doesn't work

**Verify Supabase setup**:
- All 8 database migrations completed successfully
- Email authentication enabled in Supabase dashboard
- Correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in frontend `.env.local`
- Check Supabase dashboard for user creation

**Check browser console** (F12) for specific error messages about:
- CORS errors (backend must be running)
- Supabase connection errors
- Invalid credentials

**Email confirmation**:
- Check spam/junk folder for confirmation email
- Or temporarily disable email confirmation in Supabase

### Food search doesn't work

**Verify USDA API**:
```bash
# Check supabase/.env has USDA_API_KEY
cat supabase/.env | grep USDA  # macOS/Linux
findstr USDA supabase\.env  # Windows
```

**Common issues**:
- `USDA_API_KEY` not set (falls back to rate-limited `DEMO_KEY`)
- `supabase functions serve` not running
- Rate limit exceeded (DEMO_KEY: 30/hour, Personal key: 1,000/hour)
- Network connectivity issues

**Check the CLI terminal** for USDA API error messages.

### AI features don't work

**Verify Gemini API**:
```bash
# Check supabase/.env has GOOGLE_API_KEY
cat supabase/.env | grep GOOGLE  # macOS/Linux
findstr GOOGLE supabase\.env  # Windows
```

**Common issues**:
- `GOOGLE_API_KEY` not set or invalid
- API key doesn't start with `AIzaSy`
- Rate limit exceeded (Free tier: 60/minute, 1,500/day)
- Photo format not supported

**Check the CLI terminal** for Gemini API error messages.

### Port already in use

**Backend (port 54321)**:
```bash
# Find process using port 54321
# macOS/Linux:
lsof -i :54321

# Windows:
netstat -ano | findstr :54321

# Stop other `supabase functions serve` / `supabase start` instances
```

**Frontend (port 5173)**:
Vite will automatically try the next available port (5174, 5175, etc.).

### CORS errors in browser console

**Verify**:
- `supabase functions serve` is running at `http://localhost:54321`
- `VITE_API_URL` in frontend `.env.local` is `http://localhost:54321/functions/v1`
- The calling origin is listed in `supabase/functions/_shared/cors.ts`

**Check browser console** for specific CORS error details.

## Development Tips

- Use two terminal windows/tabs: one for `supabase functions serve`, one for frontend
- Both must be running for the app to work
- The Supabase CLI terminal shows Edge Function requests and errors
- Browser console (F12) shows frontend errors
- Check Supabase dashboard to verify data is being saved

Next: [Google OAuth Setup](05-google-oauth.md) (Optional)
