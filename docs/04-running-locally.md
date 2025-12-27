# Running Locally

## Backend Setup

### Install Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Start Backend Server

```bash
uvicorn app.main:app --reload
```

Server runs at `http://localhost:8000`

API documentation available at `http://localhost:8000/docs`

### Verify Backend

Test the health endpoint:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy"}
```

## Frontend Setup

Open a new terminal window.

### Install Dependencies

```bash
cd frontend
npm install
```

### Start Development Server

```bash
npm run dev
```

Application runs at `http://localhost:5173`

### Verify Frontend

Open `http://localhost:5173` in your browser. You should see the login page.

## Test the Application

### Create Account

1. Navigate to `http://localhost:5173`
2. Click **Sign Up**
3. Enter email and password
4. Complete profile setup (age, gender, height, weight, goals)

### Test Core Features

**Meal Logging**:
1. Navigate to **Add Meal**
2. Search for a food (e.g., "chicken breast")
3. Add to meal
4. Submit

**AI Food Recognition** (requires Gemini API):
1. Navigate to **Add Meal**
2. Upload a food photo
3. Verify AI identifies foods and estimates nutrition

**Dashboard**:
1. View nutrition summary
2. Check progress charts
3. Verify meals appear in history

## Troubleshooting

### Backend won't start

**Check environment variables**:
```bash
# Verify .env file exists
ls backend/.env

# Check virtual environment is activated (you should see (venv) in prompt)
```

**Common issues**:
- Missing API keys in `.env`
- Virtual environment not activated
- Wrong Python version

### Frontend won't start

**Verify configuration**:
- `.env.local` file exists in `frontend/` directory
- All variables prefixed with `VITE_`
- Backend is running at URL specified in `VITE_API_URL`

**Common issues**:
- Missing `.env.local` file
- Backend not running
- Incorrect `VITE_API_URL`

### Can't log in

**Verify Supabase setup**:
- Database migrations completed successfully
- Email authentication enabled
- Correct Supabase URL and anon key in frontend `.env.local`

**Check browser console** for specific error messages

### Food search doesn't work

**Verify USDA API**:
- `USDA_API_KEY` set in backend `.env`
- Backend server is running
- No rate limit errors (if using DEMO_KEY, limit is 30/hour)

### AI features don't work

**Verify Gemini API**:
- `GOOGLE_API_KEY` set in backend `.env`
- API key is valid and active
- Check backend logs for specific error messages

Next: [Google OAuth Setup](05-google-oauth.md) (Optional)
