// Shared CORS + response helpers for all NutriSync Edge Functions.
// Mirrors the CORSMiddleware allow_origins list from backend/app/main.py.

export const ALLOWED_ORIGINS = [
  "https://nutrisync.me",
  "https://www.nutrisync.me",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

// Call at the top of every function to short-circuit CORS preflight requests.
export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }
  return null;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}, origin: string | null = null): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const cors = corsHeaders(origin);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(JSON.stringify(body), { ...init, headers });
}
