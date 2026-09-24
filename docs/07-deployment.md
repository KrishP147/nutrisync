# Deployment

NutriSync's backend now runs entirely as Supabase Edge Functions - there is
no Digital Ocean droplet, nginx, systemd service, or certbot cert to manage
anymore. The functions live in `supabase/functions/`, one directory per
endpoint (see `supabase/functions/*/index.ts`).

## Production Environment Variables

### Backend (Supabase Edge Function secrets)

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically
into every Edge Function - you do not set them yourself. You only need to set
the two external API keys, once per project:

```bash
supabase secrets set GOOGLE_API_KEY=<GOOGLE_API_KEY>
supabase secrets set USDA_API_KEY=<USDA_API_KEY>
```

(`USDA_API_KEY` is optional - functions fall back to USDA's public `DEMO_KEY`,
which is rate-limited to 30 requests/hour.)

### Frontend (Vercel)

Set these in the Vercel dashboard under **Project Settings** > **Environment
Variables** (all environments: Production, Preview, Development):

```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://[project-ref].supabase.co/functions/v1
```

`VITE_API_URL` previously pointed at `https://api.nutrisync.me` (the dead
droplet). Point it at the Edge Functions base URL instead. The
`api.nutrisync.me` DNS record is no longer needed and can be removed from
Namecheap - nothing serves that hostname anymore.

## Backend Deployment

### First-time setup

```bash
supabase login
supabase link --project-ref <project-ref>
```

### Deploy all functions

```bash
supabase functions deploy
```

Or deploy a single function while iterating:

```bash
supabase functions deploy chat
```

### Local development

```bash
supabase functions serve
```

Serves all functions locally at `http://localhost:54321/functions/v1/<name>`.
Set `frontend/.env.local`'s `VITE_API_URL` to that URL to test against it.

### CI/CD

The `deploy-backend` job in `.github/workflows/ci.yml` runs
`supabase functions deploy` automatically on pushes to `main` (not on PRs). It
needs the `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` repository secrets
(see below); if either is unset the deploy steps are skipped with a notice and
the job still passes.

## Frontend Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
cd frontend
vercel --prod
```

Or connect the repository to Vercel dashboard for automatic deployments on
push.

### Configuration

The `vercel.json` file at repository root handles:
- Build configuration
- Output directory
- Framework detection
- Routing rules

## Domain Configuration

### Frontend (nutrisync.me)

For Vercel deployment:
1. Add domain in Vercel dashboard
2. Point DNS to Vercel:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Vercel automatically handles SSL certificates.

### Backend (api.nutrisync.me)

No longer needed. The old DNS `A` record pointing `api.nutrisync.me` at the
retired droplet IP can be deleted in Namecheap - the frontend now calls the
Supabase Edge Functions URL directly (`https://[project-ref].supabase.co/functions/v1`),
so there's nothing to host on that subdomain. Keeping the record around is
harmless (it'll just point at a dead IP) but removing it avoids confusion.

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on each push:

1. **Frontend Tests**: Linting and Vitest tests
2. **Backend Tests**: none currently (the FastAPI test suite was retired with
   the FastAPI app; Edge Function tests would use `deno test`, not yet added)
3. **Security Scan**: Trivy vulnerability scanning
4. **Deploy Frontend**: Automatic Vercel deployment (main branch)
5. **Deploy Backend**: `supabase functions deploy` (main branch; skipped if Supabase secrets unset)

### Required GitHub Secrets

Configure in repository **Settings** > **Secrets and variables** > **Actions**:

```
VERCEL_TOKEN            # For frontend deployment
VERCEL_ORG_ID           # For frontend deployment
VERCEL_PROJECT_ID       # For frontend deployment
SUPABASE_ACCESS_TOKEN   # For `supabase functions deploy` in CI
SUPABASE_PROJECT_REF    # For `supabase functions deploy` in CI
CODECOV_TOKEN           # For coverage reports (optional)
```

`SUPABASE_ACCESS_TOKEN` is a personal access token generated at
https://supabase.com/dashboard/account/tokens. `SUPABASE_PROJECT_REF` is the
project ref shown in the Supabase dashboard URL / Project Settings > General.
Neither is set by this repo's tooling - create and add both yourself.

## Monitoring

### Edge Function logs

```bash
supabase functions logs <function-name>
```

Or view logs in the Supabase dashboard under **Edge Functions** > select a
function > **Logs**.

### Vercel Logs

View in Vercel dashboard under **Deployments** > Select deployment > **Logs**

## Troubleshooting

### Edge Function returns 500 / not found

- Confirm the function is deployed: `supabase functions list`
- Check `GOOGLE_API_KEY`/`USDA_API_KEY` are set: `supabase secrets list`
- Check function logs: `supabase functions logs <function-name>`

### Frontend build fails

Check build logs in Vercel dashboard. Common issues:
- Missing environment variables
- Incorrect `VITE_` prefix
- Build timeout (increase in Vercel settings)

### CORS errors calling Edge Functions

- Confirm the calling origin is in the `ALLOWED_ORIGINS` list in
  `supabase/functions/_shared/cors.ts`
- Vercel preview origins (`https://nutrisync-frontend-*.vercel.app`) are
  allowed via the `VERCEL_PREVIEW_ORIGIN` regex in the same file
- Redeploy the function after changing it

### Database connection errors

Verify:
- Supabase project is running
- Correct `VITE_SUPABASE_URL` in environment variables
- Network connectivity from deployment platform to Supabase
