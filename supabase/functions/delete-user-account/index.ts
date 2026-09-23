// Port of DELETE /api/user/{user_id} from backend/app/main.py
// Called as DELETE /functions/v1/delete-user-account/<user_id>
// Requires "Authorization: Bearer <supabase-session-token>" header, and that
// token must belong to the same user_id being deleted.
//
// DESTRUCTIVE - deletes, in this exact order (matches the original to handle
// foreign key constraints): meals, fasting_schedules, weight_tracking,
// user_goals, user_profile rows, then meal-photos storage files, then the
// auth user itself via the service-role admin API.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { lastPathSegment } from "../_shared/json.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

const TABLES_TO_CLEAN = ["meals", "fasting_schedules", "weight_tracking", "user_goals", "user_profile"];

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

    if (userResponse.user.id !== userId) {
      return jsonResponse({ detail: "Cannot delete another user's account" }, { status: 403 }, origin);
    }

    for (const table of TABLES_TO_CLEAN) {
      try {
        const { error } = await supabase.from(table).delete().eq("user_id", userId);
        if (error) throw error;
        console.log(`[DELETE] Deleted ${table} data for user ${userId}`);
      } catch (e) {
        console.log(`[DELETE] Warning: Failed to delete from ${table}: ${e}`);
      }
    }

    try {
      const { data: files, error: listError } = await supabase.storage.from("meal-photos").list(userId);
      if (listError) throw listError;
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${userId}/${f.name}`);
        const { error: removeError } = await supabase.storage.from("meal-photos").remove(filePaths);
        if (removeError) throw removeError;
        console.log(`[DELETE] Deleted ${filePaths.length} photos for user ${userId}`);
      }
    } catch (e) {
      console.log(`[DELETE] Warning: Failed to delete photos: ${e}`);
    }

    try {
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteAuthError) throw deleteAuthError;
      console.log(`[DELETE] Deleted auth user ${userId}`);
    } catch (e) {
      console.log(`[DELETE] Error deleting auth user: ${e}`);
      return jsonResponse({ detail: "Failed to delete user account" }, { status: 500 }, origin);
    }

    return jsonResponse(
      { success: true, message: "User account and all data deleted successfully" },
      { status: 200 },
      origin,
    );
  } catch (e) {
    console.log(`[DELETE] Unexpected error: ${e}`);
    return jsonResponse(
      { detail: `Failed to delete account: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
      origin,
    );
  }
});
