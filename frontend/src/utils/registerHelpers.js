// Pure helpers for Register: duplicate-account detection after supabase.auth.signUp.

// Generous 5 min: a false "already exists" for a genuinely new user is worse
// than missing a duplicate.
export const EXISTING_ACCOUNT_AGE_MS = 300_000;

export const DUPLICATE_ACCOUNT_MESSAGE =
  "An account with this email already exists — log in or reset your password.";

// Supabase returns identities: [] when the email is already registered (confirmed
// account). For an unconfirmed duplicate, identities come back non-empty but the
// account's created_at is old (Supabase re-signup doesn't reset it). A missing or
// unparseable created_at, or missing identities, is treated as a fresh account.
export function isExistingAccount(user, now = Date.now()) {
  if (!user) return false;
  if (user.identities?.length === 0) return true;
  if (user.created_at) {
    const createdAt = Date.parse(user.created_at);
    if (!Number.isNaN(createdAt) && now - createdAt > EXISTING_ACCOUNT_AGE_MS) {
      return true;
    }
  }
  return false;
}
