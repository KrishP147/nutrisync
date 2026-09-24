# Supabase Edge Functions

Deno functions backing the NutriSync frontend. Full deploy walkthrough:
[docs/07-deployment.md](../../docs/07-deployment.md).

## Layout

- `<name>/index.ts` - one directory per function; `index.ts` is the entrypoint.
- `_shared/` - helpers imported by functions, never deployed on their own:
  `cors.ts` (origin allow-list + JSON responses), `gemini.ts`,
  `analyzeFoodImage.ts`, `json.ts`, `supabaseAdmin.ts`.

## Secrets

| Secret | Used by | Notes |
| --- | --- | --- |
| `GOOGLE_API_KEY` | Gemini-backed functions (chat, recommendations, image analysis, ...) | Required |
| `USDA_API_KEY` | `search-food`, `food-details` | Optional; falls back to USDA `DEMO_KEY` (heavily rate-limited) |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase.

```bash
supabase secrets set GOOGLE_API_KEY=<key> USDA_API_KEY=<key>
```

## Local dev and deploy

```bash
supabase functions serve            # run all functions locally
supabase functions deploy           # deploy all
supabase functions deploy <name>    # deploy one
```

## CI

The `supabase-functions-check` job in `.github/workflows/ci.yml` runs
`deno check supabase/functions/*/index.ts` on pushes and PRs. Marking the job
required is a manual branch-protection setting (repo Settings > Branches).
