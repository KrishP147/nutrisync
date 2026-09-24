# Troubleshooting

Common issues and solutions when setting up or running NutriSync.

## Setup Issues

### Database Migration Errors

**Error**: "relation already exists"

Solution:
- Migrations are idempotent and safe to re-run
- This warning can be ignored
- Verify all 8 migrations completed by checking Table Editor

**Error**: "function update_updated_at_column() does not exist"

Solution:
- Run migrations in correct order
- Ensure `001_setup_functions.sql` completed successfully
- Re-run `001_setup_functions.sql` then continue

**Error**: "permission denied for table"

Solution:
- Row Level Security (RLS) is blocking access
- Verify you're authenticated (check `auth.uid()` returns a value)
- Check RLS policies exist in **Authentication** > **Policies**
- In SQL Editor, you can temporarily disable RLS for testing: `SET LOCAL row_security = off;`

### Environment Variable Issues

**Backend (Edge Function) secrets not loading**

Check:
- Deployed: set via `supabase secrets set GOOGLE_API_KEY=...` / `supabase secrets list`
- Local dev: `supabase/.env` exists and `supabase functions serve --env-file supabase/.env` was used
- No quotes around values
- Restart `supabase functions serve` after changes

**Frontend variables not loading**

Check:
- File named `.env.local` (not `.env`)
- All variables prefixed with `VITE_`
- Restart dev server after changes
- Verify in code: `console.log(import.meta.env.VITE_SUPABASE_URL)`

### API Connection Errors

**Backend: "Invalid API key" (Gemini)**

Check:
- Copy full API key from Google AI Studio
- No spaces or newlines
- Re-set with `supabase secrets set GOOGLE_API_KEY=...`
- API key starts with `AIzaSy`

**Backend: "403 Forbidden" (USDA API)**

Check:
- USDA API key is valid
- Not using `DEMO_KEY` in production
- Haven't exceeded rate limits (1000/hour with personal key, 30/hour with DEMO_KEY)

**Backend: "503 Food database rate-limited" / UI shows "Search unavailable, try again"**

USDA returned 429; `search-food`/`food-details` map it to 503. Wait and retry, or set a personal
`USDA_API_KEY` (functions log a warning when falling back to `DEMO_KEY`). Users can still "Add manually".

**Backend: "Supabase not configured"**

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
the Edge Functions platform - this error means the function isn't actually
running as a deployed/served Supabase Edge Function. Check:
- Supabase project is active
- You're hitting a real deployed function or `supabase functions serve`, not a stale URL

## Runtime Issues

### Authentication Problems

**Can't log in / sign up**

Check:
- Supabase project is running
- Email provider enabled in **Authentication** > **Providers**
- Database migrations completed
- Check browser console for specific errors
- Verify Supabase URL and anon key in frontend `.env.local`

**"Email already registered" but can't log in**

Check:
- Email confirmation required - check spam folder
- Use password reset if forgotten
- Or disable email confirmation in Supabase for development

**Google OAuth not working**

Check:
- OAuth configured in Google Cloud Console
- Redirect URI exactly matches Supabase callback URL
- Your email added as test user (if app not published)
- Allowed JavaScript origins include your frontend URL

### Feature Issues

**Food search returns no results**

"No foods found" means the search succeeded with zero matches; a failed search shows
"Search unavailable, try again" instead (see the 503 entry above).

Solutions:
- Try simpler search terms (e.g., "apple" instead of "green apple")
- USDA database is US-centric
- Check backend logs for API errors
- Verify `USDA_API_KEY` is set
- Try different data types (Survey, Foundation, SR Legacy)

**AI food recognition not working**

Check:
- `GOOGLE_API_KEY` is set (`supabase secrets set` / `supabase/.env` locally)
- Photo file size under 10MB
- Photo format is JPEG or PNG
- Check backend logs for Gemini API errors
- Verify API key is active at ai.google.com

**Photo upload fails**

Check:
- `meal-photos` bucket exists in Supabase Storage
- Bucket is marked as Public
- Storage policies exist (3 policies for upload/view/delete)
- Photo path format is `{user_id}/{filename}`
- File size under 10MB limit

**Nutrition data missing or incorrect**

Solutions:
- USDA data quality varies by food
- Try similar food from different dataset
- Allow users to manually edit (feature already implemented)
- Use Foundation foods for most complete data

### Performance Issues

**Slow API responses**

Check:
- Edge Functions are deployed and responding
- USDA API not timing out (the `search-food`/`food-details` functions use a 10s fetch timeout)
- Gemini API rate limits not exceeded
- Network connectivity

**Frontend loading slow**

Check:
- Backend API URL correct in `VITE_API_URL`
- CORS configured properly
- Images optimized
- Check Network tab in browser DevTools

### Email Issues

**Not receiving confirmation emails**

Solutions:
- Check spam folder
- Supabase default email has rate limits
- For production, configure custom SMTP
- Or disable email confirmation for development

**Emails going to spam**

Solutions:
- Configure custom domain with SPF/DKIM/DMARC records
- Use established email service (SendGrid, AWS SES, Resend)
- Upgrade to Supabase Pro for their email service
- See [Database Setup - Production Considerations](02-database-setup.md#production-considerations)

## Deployment Issues

### Backend Deployment (Supabase Edge Functions)

**Function fails to deploy**

Check:
- Logged in and linked: `supabase login`, `supabase link --project-ref <ref>`
- `supabase functions deploy` output for a specific error
- Deno syntax errors in the changed `index.ts`

**Function deploys but returns errors at runtime**

Check:
- Secrets are set: `supabase secrets list` (`GOOGLE_API_KEY`, `USDA_API_KEY`)
- Function logs: `supabase functions logs <function-name>`

### Frontend Deployment

**Build fails on Vercel**

Check:
- All `VITE_` environment variables set
- Node version matches (18+)
- Build command correct: `npm run build`
- Output directory: `dist`
- Check build logs for missing dependencies

**App loads but API calls fail**

Check:
- `VITE_API_URL` points to `https://[project-ref].supabase.co/functions/v1` (not localhost)
- The calling origin is in `ALLOWED_ORIGINS` in `supabase/functions/_shared/cors.ts`
- The Edge Functions are deployed (`supabase functions list`)
- Check browser Network tab for specific errors

### Database Connection

**"Error connecting to database"**

Check:
- Supabase project is active
- Correct project URL
- RLS policies configured
- User authenticated
- Network allows connection to Supabase

## Testing Issues

**Backend tests fail locally**

There is no automated backend test suite currently (see
[Testing](06-testing.md)) - verify Edge Functions manually with
`supabase functions serve` and `curl` instead.

**Frontend tests fail**

Check:
- Node modules installed: `npm install`
- Test environment configured
- Mock data available
- Clear cache: `rm -rf node_modules && npm install`

**Tests pass locally but fail in CI**

Check:
- GitHub Secrets configured correctly
- CI environment variables match local
- No system-specific paths in tests
- Dependencies locked in package files

## Getting Additional Help

If issues persist:

1. **Check logs**:
   - Backend: `supabase functions logs <function-name>`
   - Frontend: Browser console (F12)
   - Supabase: **Logs** section in dashboard

2. **Verify setup**:
   - Review relevant documentation section
   - Double-check environment variables
   - Confirm prerequisites installed

3. **Test incrementally**:
   - Test each component separately
   - Use health check endpoints
   - Verify database connection
   - Test API endpoints via `/docs`

4. **Common solutions**:
   - Restart servers
   - Clear cache/node_modules
   - Check for typos in configuration
   - Verify API keys are active
