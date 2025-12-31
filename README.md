# NutriSync

[![Live Demo](https://img.shields.io/badge/demo-nutrisync.me-brightgreen)](https://nutrisync.me)
[![CI](https://github.com/KrishP147/nutrisync/actions/workflows/ci.yml/badge.svg)](https://github.com/KrishP147/nutrisync/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/KrishP147/nutrisync/branch/main/graph/badge.svg)](https://codecov.io/gh/KrishP147/nutrisync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)

Full-stack nutrition tracking application with AI-powered food recognition and intermittent fasting support.

## Overview

NutriSync combines intelligent meal logging, personalized nutrition tracking, and fasting features into a comprehensive health platform. Upload food photos for instant AI analysis, search a database of 400,000+ foods, track macros against custom goals, and monitor fasting schedules with built-in timers.

**Note**: This monorepo combines frontend and backend. Original separate repositories ([frontend](https://github.com/KrishP147/nutrisync-frontend), [backend](https://github.com/KrishP147/nutrisync-backend)) are archived.

## Features

**Core Functionality**
- AI food recognition via photo upload (Google Gemini AI)
- Comprehensive food database search (USDA FoodData Central - 400,000+ foods)
- Customizable nutrition goals with BMR/TDEE calculations
- Intermittent fasting tracking (16:8, 18:6, 20:4, OMAD schedules)
- Progress visualization with interactive charts
- Achievement system for goal streaks
- Dietary restriction support (Halal, Kosher, Vegan, Vegetarian, Gluten-Free, etc.)

**Technical Features**
- Google OAuth authentication
- Email infrastructure with Resend SMTP (custom domain with SPF/DKIM/DMARC)
- Password reset, email change verification, account deletion
- Row Level Security (RLS) for data privacy
- Real-time meal photo storage
- AI nutrition assistant chatbot
- Responsive design with dark mode
- Comprehensive testing (Backend 74.5%, Frontend 60.4% coverage)
- Separate coverage tracking via Codecov flags

## Tech Stack

**Frontend**: React 18, Vite, Tailwind CSS, Plotly.js, Supabase Client

**Backend**: FastAPI, Google Gemini AI, USDA API, Supabase

**Infrastructure**: Supabase (PostgreSQL + Auth + Storage), Digital Ocean (Backend), Vercel (Frontend), GitHub Actions (CI/CD)

## Documentation

Complete setup instructions: **[docs/README.md](docs/README.md)**

### Quick Links

1. [Prerequisites](docs/01-prerequisites.md) - Required software and accounts
2. [Database Setup](docs/02-database-setup.md) - Supabase and migrations
3. [API Configuration](docs/03-api-configuration.md) - External APIs
4. [Running Locally](docs/04-running-locally.md) - Development setup
5. [Google OAuth](docs/05-google-oauth.md) - Optional OAuth setup
6. [Testing](docs/06-testing.md) - Running tests
7. [Deployment](docs/07-deployment.md) - Production deployment
8. [Troubleshooting](docs/08-troubleshooting.md) - Common issues and solutions

## Quick Start

### Install Dependencies

Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Frontend:
```bash
cd frontend
npm install
```

### Configure Environment

Create `backend/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_KEY=your_anon_key
GOOGLE_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_key
```

Create `frontend/.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

### Run Application

Backend:
```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm run dev
```

Access at `http://localhost:5173`

## Project Structure

```
nutrisync/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── main.py      # API routes (13 endpoints)
│   │   └── services/    # Gemini AI integration
│   ├── tests/           # Backend tests (85 tests, 74.5% coverage)
│   ├── migrations/      # Database migrations (8 files)
│   └── deploy.sh        # Deployment script
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page routes
│   │   └── services/    # API clients
│   └── tests/           # Frontend tests (137 tests, 60.4% coverage)
├── docs/                # Setup documentation
└── .github/workflows/   # CI/CD configuration
```

## Testing

**Coverage**: Backend 74.5% | Frontend 60.4% | Overall 65.28%

Backend:
```bash
cd backend
pytest tests/ -v                          # Run all tests
pytest tests/ --cov=app --cov-report=html # With coverage report
```

Frontend:
```bash
cd frontend
npm test                  # Run all tests
npm run test:coverage    # With coverage report
```

**Test Organization**:
- Backend: 85 tests across 13 files (API endpoints, AI services, user management, fasting, edge cases)
- Frontend: 137 tests across 16 files (contexts, components, pages, charts)

**CI/CD**: Automated testing on every push via GitHub Actions with separate coverage tracking for backend and frontend

## Deployment

**Backend**: Digital Ocean App Platform via `backend/deploy.sh`

**Frontend**: Vercel with automatic GitHub integration

See [Deployment Guide](docs/07-deployment.md) for detailed instructions.

## License

MIT License - see [LICENSE](LICENSE) file

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Open a Pull Request

Run tests before submitting:
- Backend: `pytest tests/`
- Frontend: `npm test`
