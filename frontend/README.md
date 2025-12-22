# NutriSync Frontend

Modern React application for NutriSync, built with Vite, Tailwind CSS, and Framer Motion. Located in the `frontend/` directory of the combined repository.

## 🚀 Features
- **Dashboard**: Real-time stats and fasting tracking
- **AI Logging**: Log meals via photo analysis or search
- **Progress**: Visualized nutrition and fasting trends
- **Recommendations**: Personalized AI-driven health tips
- **Responsive Design**: Premium dark-mode aesthetic

## 📂 Structure
- `src/components/`: Reusable UI components
- `src/contexts/`: Global state management
- `src/pages/`: Main application pages
- `src/services/`: API communication layer

## 🛠️ Local Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables in `.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_API_URL=http://localhost:8000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## 🚢 Deployment
Recommended deployment on **Vercel**:
1. Connect your GitHub repository.
2. Set the **Root Directory** to `frontend`.
3. Set environment variables.
4. Deploy!

## 🧪 Testing
Run the test suite:
```bash
npm test
```
