# NutriSync Backend

Backend API for the NutriSync application, located within the `backend/` directory of the combined repository.

## Features
- **FastAPI**: High-performance Python API
- **Gemini AI**: Nutrition analysis and fasting recommendations
- **Supabase Integration**: Data persistence and Auth
- **USDA API**: Food database integration
- **Automated Testing**: Pytest suite for API and logic

## Structure
- `app/`: Main application logic
- `tests/`: Automated test suite
- `nginx.conf`: Nginx configuration for proxying
- `nutrisync.service`: Systemd service definition
- `deploy.sh`: Automated deployment script for Ubuntu

## Local Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```
4. Setup environment variables in `.env` (copy from `.env.example`)
5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

## 🚢 Deployment
For detailed deployment instructions on Digital Ocean using the combined repository structure, please see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🧪 Testing
Run the test suite:
```bash
pytest
```
