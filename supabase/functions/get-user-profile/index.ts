// Port of GET /api/user/{user_id} from backend/app/main.py
// Called as GET /functions/v1/get-user-profile/<user_id>
// Requires "Authorization: Bearer <supabase-session-token>" header.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { lastPathSegment } from "../_shared/json.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse({ detail: "Supabase not configured" }, { status: 503 }, origin);
  }

  const authorization = req.headers.get("authorization");
  if (!authorization) {
    return jsonResponse({ detail: "Authorization header required" }, { status: 401 }, origin);
  }

  try {
    const userId = lastPathSegment(req);
    if (!userId) {
      return jsonResponse({ detail: "user_id must be provided as a path segment" }, { status: 422 }, origin);
    }

    const token = authorization.replace("Bearer ", "");

    const { data: userResponse, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userResponse?.user) {
      return jsonResponse({ detail: "Invalid token" }, { status: 401 }, origin);
    }

    const { data, error } = await supabase.from("user_profile").select("*").eq("user_id", userId);
    if (error) throw error;

    if (!data || data.length === 0) {
      return jsonResponse({ detail: "User profile not found" }, { status: 404 }, origin);
    }

    return jsonResponse({ exists: true, user_id: userId }, { status: 200 }, origin);
  } catch (e) {
    console.log(`[GET USER] Error: ${e}`);
    return jsonResponse({ detail: "Failed to check user profile" }, { status: 500 }, origin);
  }
});
