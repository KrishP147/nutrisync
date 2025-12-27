# Documentation

Complete setup and deployment guide for NutriSync.

## Setup Guide

Follow these guides in order:

1. [Prerequisites](01-prerequisites.md) - Required software and accounts
2. [Database Setup](02-database-setup.md) - Supabase configuration and migrations
3. [API Configuration](03-api-configuration.md) - Google Gemini AI and USDA API
4. [Running Locally](04-running-locally.md) - Start the application
5. [Google OAuth](05-google-oauth.md) - Optional: "Sign in with Google"
6. [Testing](06-testing.md) - Run and write tests
7. [Deployment](07-deployment.md) - Production deployment
8. [Troubleshooting](08-troubleshooting.md) - Common issues and solutions

## Database Migrations

Database schema is managed through sequential migration files in `backend/migrations/`.

See [backend/migrations/README.md](../backend/migrations/README.md) for details.

## Additional Resources

- [Main README](../README.md) - Project overview
- [Backend README](../backend/README.md) - Backend architecture
- [Frontend README](../frontend/README.md) - Frontend architecture
- [CI/CD Workflow](../.github/workflows/ci.yml) - GitHub Actions configuration

## Quick Reference

### Environment Variables

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_KEY=your_anon_key
GOOGLE_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_key
```

**Frontend** (`frontend/.env.local`):
```env
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

### Common Commands

**Backend**:
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
uvicorn app.main:app --reload  # Start server
pytest tests/ -v  # Run tests
```

**Frontend**:
```bash
cd frontend
npm install  # Install dependencies
npm run dev  # Start development server
npm test  # Run tests
```

## Getting Help

- Check troubleshooting sections in each guide
- Review error messages in browser console and terminal
- Verify environment variables are set correctly
- Ensure all migrations completed successfully
