import axios from 'axios';

// Points at the Supabase Edge Functions base URL, e.g.
// https://<project-ref>.supabase.co/functions/v1
// For local dev against `supabase functions serve`, the default is
// http://localhost:54321/functions/v1.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:54321/functions/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;