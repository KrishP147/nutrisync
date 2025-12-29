# Running Locally

**Estimated time**: 10-15 minutes

**Important**: You need TWO terminal windows running simultaneously - one for backend, one for frontend.

## Backend Setup

### Install Dependencies

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

**Create virtual environment**:
```bash
python -m venv venv
```

**Activate virtual environment**:

On **macOS/Linux**:
```bash
source venv/bin/activate
```
You should see `(venv)` at the start of your terminal prompt.

On **Windows** (Command Prompt):
```bash
venv\Scripts\activate
```

On **Windows** (PowerShell):
```bash
venv\Scripts\Activate.ps1
```

**Install dependencies**:
```bash
pip install -r requirements.txt
```

This will install all required Python packages (~2-3 minutes).

### Start Backend Server

**Ensure virtual environment is activated** (look for `(venv)` in prompt):
```bash
uvicorn app.main:app --reload
```

You should see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Server URLs**:
- API: `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Verify Backend

**Test the health endpoint** (open a new terminal):
```bash
curl http://localhost:8000/health
```

**Expected response**:
```json
{"status": "healthy"}
```

Or visit `http://localhost:8000/docs` in your browser to see the interactive API documentation.

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

### Backend won't start

**Check virtual environment**:
```bash
# Verify .env file exists
ls backend/.env  # macOS/Linux
dir backend\.env  # Windows

# Check if virtual environment is activated
# You should see (venv) at the start of your prompt
```

**If you don't see (venv)**:
```bash
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

**Check Python version**:
```bash
python --version
# Should show 3.11.x or higher
```

**Common issues**:
- Missing API keys in `.env` file
- Virtual environment not activated
- Wrong Python version
- Missing dependencies - run `pip install -r requirements.txt`
- Port 8000 already in use - stop other processes or change port

**Check backend logs** in the terminal for specific error messages.

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
- Backend not running (must be started first)
- Incorrect `VITE_API_URL` (should be `http://localhost:8000`)
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
# Check backend .env has USDA_API_KEY
cat backend/.env | grep USDA  # macOS/Linux
findstr USDA backend\.env  # Windows
```

**Common issues**:
- `USDA_API_KEY` not set in backend `.env`
- Backend server not running
- Rate limit exceeded (DEMO_KEY: 30/hour, Personal key: 1,000/hour)
- Network connectivity issues

**Check backend terminal** for USDA API error messages.

### AI features don't work

**Verify Gemini API**:
```bash
# Check backend .env has GOOGLE_API_KEY
cat backend/.env | grep GOOGLE  # macOS/Linux
findstr GOOGLE backend\.env  # Windows
```

**Common issues**:
- `GOOGLE_API_KEY` not set or invalid
- API key doesn't start with `AIzaSy`
- Rate limit exceeded (Free tier: 60/minute, 1,500/day)
- Photo file too large (>10MB)
- Photo format not supported

**Check backend terminal** for Gemini API error messages.

### Port already in use

**Backend (port 8000)**:
```bash
# Find process using port 8000
# macOS/Linux:
lsof -i :8000

# Windows:
netstat -ano | findstr :8000

# Kill the process or use different port:
uvicorn app.main:app --reload --port 8001
```

**Frontend (port 5173)**:
Vite will automatically try the next available port (5174, 5175, etc.).

### CORS errors in browser console

**Verify**:
- Backend is running at `http://localhost:8000`
- `VITE_API_URL` in frontend `.env.local` matches backend URL
- No typos in URL (http not https for local development)

**Check browser console** for specific CORS error details.

## Development Tips

- Use two terminal windows/tabs: one for backend, one for frontend
- Both must be running for the app to work
- Backend logs show API requests and errors
- Browser console (F12) shows frontend errors
- Use `http://localhost:8000/docs` to test API endpoints directly
- Check Supabase dashboard to verify data is being saved

Next: [Google OAuth Setup](05-google-oauth.md) (Optional)
