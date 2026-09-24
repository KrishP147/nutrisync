// Pure helpers for deciding OAuth (Google) sign-in/sign-up behavior.
// No client-side clocks (new Date()/Date.now()) - decisions are based only
// on server-provided fields (user.created_at, user.last_sign_in_at) so the
// result can't drift due to network latency or client clock skew.

/**
 * Decide whether a Supabase auth user looks like a brand-new account, based
 * only on server-provided timestamps.
 *
 * @param {{ created_at?: string, last_sign_in_at?: string } | null | undefined} user
 * @param {number} thresholdMs
 * @returns {boolean|null} true if new, false if existing, null if unknown
 */
export function isNewOAuthAccount(user, thresholdMs = 30000) {
  if (!user) return null;

  const createdAt = Date.parse(user.created_at);
  const lastSignInAt = Date.parse(user.last_sign_in_at);

  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) return null;

  const diff = Math.abs(lastSignInAt - createdAt);
  return diff <= thresholdMs;
}

/**
 * Decide what action to take for a Google OAuth sign-in, based on where the
 * flow originated and server-known account state.
 *
 * @param {{ origin: 'register'|'login'|string, user: object|null|undefined, hasProfile: boolean }} params
 * @returns {'allow'|'block_existing'|'allow_to_profile'}
 */
export function resolveOAuthAction({ origin, user, hasProfile }) {
  if (origin === 'register') {
    const isNew = isNewOAuthAccount(user);
    if (isNew === false) return 'block_existing';
    return 'allow';
  }

  if (origin === 'login') {
    if (!hasProfile) return 'allow_to_profile';
    return 'allow';
  }

  return 'allow';
}
