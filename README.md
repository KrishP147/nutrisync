# NutriSync

Personalized Health & Nutrition Tracking with AI-Powered Insights and Intermittent Fasting Support.

## 🌟 Features

- **AI-Powered Food Recognition**: Upload meal photos for instant nutritional analysis using Google Gemini AI
- **Comprehensive Meal Logging**: Search USDA FoodData Central database with 400,000+ foods
- **Intermittent Fasting Tracking**: Built-in fasting timer with customizable schedules (16:8, 18:6, 20:4, OMAD)
- **Smart Recommendations**: AI-generated dietary insights based on your nutrition history and goals
- **Progress Visualization**: Interactive charts tracking macros, calories, and trends over time
- **Photo Gallery**: Visual meal history with searchable photo archive
- **Dietary Preferences**: Support for Halal, Kosher, Vegetarian, Vegan, Gluten-Free, and Dairy-Free diets
- **Personalized Goals**: Calculate and track custom calorie and macro targets based on BMR/TDEE

## 🏗️ Tech Stack

### Frontend
- **React 18** with **Vite** for fast development and optimized builds
- **React Router** for client-side routing
- **Motion (Framer Motion)** for smooth animations
- **Tailwind CSS** for responsive, dark-mode UI
- **Plotly.js** for interactive data visualization
- **Lucide React** for beautiful icons
- **Supabase Client** for authentication and database
- **Vitest + React Testing Library** for component testing

### Backend
- **FastAPI** - Modern Python web framework with automatic API documentation
- **Google Gemini AI** - Advanced multimodal AI for image recognition and recommendations
- **USDA FoodData Central API** - Comprehensive nutrition database
- **Supabase** - PostgreSQL database with Row Level Security (RLS)
- **pytest** - Python testing framework with 35% code coverage

### Infrastructure
- **Supabase**: Authentication, PostgreSQL database, file storage
- **Digital Ocean**: Backend API hosting
- **Vercel**: Frontend hosting (recommended)
- **GitHub Actions**: CI/CD pipelines for automated testing and deployment

## 📁 Repository Structure

- **`backend/`**: FastAPI application, Gemini AI services, and Digital Ocean deployment scripts
- **`frontend/`**: React + Vite application with premium dark-mode UI
- **`reference-files/`**: SQL migrations, documentation, and project guides
- **`.github/workflows/`**: CI/CD pipeline configurations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Supabase account
- Google Gemini API key (optional, for AI features)
- USDA FoodData Central API key (optional)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Frontend Setup
```bash
cd frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Database Setup
Run the SQL migrations in Supabase SQL Editor:
1. [reference-files/fasting_migration.sql](./reference-files/fasting_migration.sql) - Fasting tables and policies
2. Follow instructions in [DATABASE_SETUP.md](./DATABASE_SETUP.md)

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test              # Run all tests
npm run test:ui       # Run with Vitest UI
npm run test:coverage # Generate coverage report
```

**Test Results**: 14 passing / 24 tests (component and integration tests)

### Backend Tests
```bash
cd backend
pytest tests/ -v                    # Verbose output
pytest tests/ --cov=app --cov-report=html  # With coverage
```

**Test Results**: 17 passing / 31 tests, 35% code coverage

## 🚢 Deployment

### Backend Deployment (Digital Ocean)
```bash
cd backend
chmod +x deploy.sh
./deploy.sh
```

See [backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md) for detailed instructions.

**Environment Variables Required**:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/public key
- `GEMINI_API_KEY` - Google Gemini API key
- `USDA_API_KEY` - USDA FoodData Central API key

### Frontend Deployment (Vercel)
1. Connect GitHub repository to Vercel
2. Set root directory to `frontend/`
3. Add environment variables in Vercel dashboard
4. Deploy

## 🔐 Environment Variables

### Backend (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
USDA_API_KEY=your-usda-key
ENVIRONMENT=production
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend-url.com
```

## 📊 CI/CD Pipelines

Automated workflows via GitHub Actions:

- **Backend CI**: Python testing, linting, coverage reporting (Codecov)
- **Frontend CI**: Node.js testing, build verification
- **Backend CD**: Automated deployment to Digital Ocean on main branch push
- **Frontend CD**: Automated deployment to Vercel on main branch push

See [.github/workflows/](./.github/workflows/) for pipeline configurations.

## 📖 Documentation

- [THOROUGH_PROJECT_DESC.md](./reference-files/THOROUGH_PROJECT_DESC.md) - Comprehensive project documentation
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database migration guide
- [FASTING_WARNING_UPDATE.md](./FASTING_WARNING_UPDATE.md) - Fasting feature documentation
- [backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md) - Backend deployment guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License
See [LICENSE](./LICENSE) for details.

## 📧 Contact
For questions or support, contact: krishnet1@hotmail.com
