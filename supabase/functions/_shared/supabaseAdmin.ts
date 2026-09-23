// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically injected into
// every Edge Function's environment by the Supabase platform - no need to
// set them via `supabase secrets set`.
import { createClient } from "npm:@supabase/supabase-js@2";

export function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}
