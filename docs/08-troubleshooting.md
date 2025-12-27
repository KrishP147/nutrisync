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

**Backend variables not loading**

Check:
- `.env` file exists in `backend/` directory
- No quotes around values
- Virtual environment is activated
- Restart backend server after changes

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
- Remove quotes in `.env` file
- API key starts with `AIzaSy`

**Backend: "403 Forbidden" (USDA API)**

Check:
- USDA API key is valid
- Not using `DEMO_KEY` in production
- Haven't exceeded rate limits (1000/hour with personal key, 30/hour with DEMO_KEY)

**Backend: "Supabase not configured"**

Check:
- `SUPABASE_URL` set correctly
- `SUPABASE_SERVICE_ROLE_KEY` set (not anon key)
- Supabase project is active

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

Solutions:
- Try simpler search terms (e.g., "apple" instead of "green apple")
- USDA database is US-centric
- Check backend logs for API errors
- Verify `USDA_API_KEY` is set
- Try different data types (Survey, Foundation, SR Legacy)

**AI food recognition not working**

Check:
- `GOOGLE_API_KEY` is set in backend `.env`
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
- Backend server is running
- USDA API not timing out (increase timeout in `main.py`)
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

### Backend Deployment

**Service won't start on Digital Ocean**

Check:
- Environment variables set in App Platform dashboard
- Python version matches requirements (3.11+)
- All dependencies in `requirements.txt`
- Check deployment logs for specific errors

**SSL certificate errors**

Solutions:
- Verify domain DNS points to correct IP
- Run certbot manually: `certbot --nginx -d api.yourdomain.com`
- Check Nginx configuration
- Renew certificates: `certbot renew`

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
- `VITE_API_URL` points to deployed backend (not localhost)
- Backend has CORS enabled for frontend domain
- Backend is running and accessible
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

Check:
- Virtual environment activated
- All dev dependencies installed: `pip install -r requirements-dev.txt`
- Environment variables set for tests
- Mock services configured properly

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
   - Backend: Terminal output or `journalctl -u nutrisync -f`
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
