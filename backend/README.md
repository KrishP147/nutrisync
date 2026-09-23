# NutriSync Database Migrations

The `backend/` directory previously held a FastAPI service deployed to a
Digital Ocean droplet. That service has been retired - all 12 of its API
endpoints were ported to Supabase Edge Functions, which now live in
`supabase/functions/`. See `supabase/functions/*/index.ts` for the current
implementation, and the repo root README for the current architecture.

`backend/` now contains only the historical SQL migrations used to build the
Supabase Postgres schema (auth, `meals`, `fasting_schedules`,
`weight_tracking`, `user_goals`, `user_profile`, etc).

## Structure

- `migrations/`: SQL migration files, in sequential order - see
  `migrations/README.md` for how to run them against a Supabase project's SQL
  Editor.
