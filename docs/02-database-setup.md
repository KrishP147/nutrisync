# Database Setup

**Estimated time**: 15-20 minutes

This guide covers setting up Supabase as your database, authentication, and storage provider.

## Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Sign in with your Supabase account
3. Click **New Project**
4. Choose your organization (or create one)
5. Fill in project details:
   - **Name**: nutrisync (or your preferred name)
   - **Database Password**: Click "Generate a password" and save it securely
     - **Important**: Save this password - you'll need it for direct database access
     - Store in a password manager or secure note
   - **Region**: Select closest to your target users
     - US East for Americas
     - Europe West for Europe
     - Southeast Asia for Asia/Pacific
6. Click **Create new project**
7. Wait 2-3 minutes for project initialization

## Gather API Credentials

Navigate to **Project Settings** > **API**:

Copy these three values:
- **Project URL** - `https://[project-ref].supabase.co`
- **anon public** - Long JWT token (safe for frontend)
- **service_role** - Long JWT token (backend only, keep secret)

## Run Database Migrations

Navigate to **SQL Editor** in Supabase dashboard (left sidebar).

Run each migration file from `backend/migrations/` **in sequential order**. These migrations are idempotent (safe to re-run).

**For each migration file**:
1. Open the file in your code editor
2. Copy the entire contents
3. In Supabase SQL Editor, paste the SQL
4. Click **Run** (or press Ctrl/Cmd + Enter)
5. Wait for success message
6. Check for any errors before proceeding
7. Proceed to next file

**Migration Order** (must be followed):
```
1. 001_setup_functions.sql      # Creates helper functions
2. 002_user_management.sql      # User profile and goals tables
3. 003_user_enhancements.sql    # BMI, fiber, dietary restrictions
4. 004_weight_tracking.sql      # Weight history tracking
5. 005_meal_tracking.sql        # Meals and meal components
6. 006_meal_enhancements.sql    # Photos, notes, custom foods
7. 007_achievements.sql         # Daily achievement tracking
8. 008_fasting.sql             # Fasting sessions
```

**Note**: If you see "relation already exists" warnings, these can be ignored - migrations are designed to be idempotent.

**Verification After Each Migration**:
- Navigate to **Table Editor** in sidebar
- Verify new tables appear as expected
- Check that RLS policies are created (view in Table Editor > [table] > Policies)

See [backend/migrations/README.md](../backend/migrations/README.md) for detailed migration documentation.

## Row Level Security (RLS) Policies

**All tables are protected by Row Level Security (RLS)** to ensure users can only access their own data. The migrations automatically create these policies, but you should verify them.

### Verify RLS is Enabled

1. Navigate to **Table Editor** in Supabase dashboard
2. Select a table (e.g., `meals`, `user_profile`)
3. Click **Policies** tab at the top
4. Verify "RLS enabled" badge is shown

### Policy Structure

Each table has 4 standard policies (SELECT, INSERT, UPDATE, DELETE):

**Example for `meals` table**:
- ✅ "Users can view own meals" - `SELECT` using `auth.uid() = user_id`
- ✅ "Users can insert own meals" - `INSERT` with check `auth.uid() = user_id`
- ✅ "Users can update own meals" - `UPDATE` using `auth.uid() = user_id`
- ✅ "Users can delete own meals" - `DELETE` using `auth.uid() = user_id`

### Tables with Full RLS Protection

Verify all 9 tables have RLS enabled with 4 policies each:

1. **user_profile** - Personal details, BMI, dietary restrictions
2. **user_goals** - Daily nutrition goals and fasting settings
3. **weight_history** - Weight tracking over time (INSERT, UPDATE, SELECT only)
4. **meals** - Meal logs with nutrition data
5. **meal_components** - Individual foods within meals
6. **daily_achievements** - Daily goal completion tracking
7. **fasting_sessions** - Fasting start/end tracking
8. **user_foods** - Custom user-created foods (RLS enabled via migration 006)

### Testing RLS (Optional but Recommended)

To verify RLS is working correctly:

1. Create a test account in your app
2. Add a meal or profile data
3. In Supabase **SQL Editor**, try to query another user's data:
   ```sql
   -- This should return ONLY your own meals, not other users'
   SELECT * FROM meals;
   ```
4. The query uses the authenticated user's JWT, so you'll only see your data

**What RLS Protects Against**:
- ✅ Users accessing other users' meal logs
- ✅ Users modifying other users' goals
- ✅ Users viewing other users' photos
- ✅ Unauthorized API access to user data

See [backend/migrations/README.md](../backend/migrations/README.md) for detailed migration documentation.

## Configure Storage

### Create Bucket

1. Navigate to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Settings:
   - **Name**: `meal-photos`
   - **Public bucket**: Enable
4. Click **Create bucket**

### Add Storage Policies

Click on `meal-photos` bucket, go to **Policies**, add these three policies:

**Allow uploads to own folder**:
```sql
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meal-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Allow viewing own photos**:
```sql
CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'meal-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Allow deleting own photos**:
```sql
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'meal-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Enable Authentication

### Email Authentication

Navigate to **Authentication** > **Providers** > **Email**:
- **Enable email provider**: On (enabled by default)
- **Confirm email**: Enable for production (recommended)
- **Secure email change**: Enable (recommended)

**Email Delivery**:
Supabase handles all email sending (password resets, email verification, magic links). For development:
- Uses Supabase's default email service (rate-limited)
- Emails may go to spam folder

For production:
- Configure custom SMTP in **Project Settings** > **Auth** > **SMTP Settings**
- Or use Supabase's production email service (included in paid plans)
- Custom domain recommended for deliverability

See [Production Considerations](#production-considerations) below for email and domain setup.

### Google OAuth (Optional)

For "Sign in with Google" functionality, see [Google OAuth Setup](05-google-oauth.md).

## Verification

Navigate to **Table Editor**. You should see these tables:
- user_profile ✅ (RLS enabled)
- user_goals ✅ (RLS enabled)
- weight_history ✅ (RLS enabled)
- meals ✅ (RLS enabled)
- meal_components ✅ (RLS enabled)
- user_foods ✅ (RLS enabled)
- daily_achievements ✅ (RLS enabled)
- fasting_sessions ✅ (RLS enabled)

Navigate to **Storage**. You should see:
- meal-photos (bucket with 3 policies)

**Security Checklist**:
- ✅ All 9 tables have RLS enabled
- ✅ Each table has 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Storage bucket has upload, view, and delete policies
- ✅ Email authentication is enabled

## Production Considerations

### Custom Email Domain

For production email reliability:

1. **Purchase a domain** (e.g., via Namecheap, Google Domains)
2. **Configure DNS records** for email authentication:
   - SPF record for sender validation
   - DKIM record for email signing
   - DMARC record for reporting

3. **Configure Supabase SMTP**:
   - Navigate to **Project Settings** > **Auth** > **SMTP Settings**
   - Options:
     - Use a service like SendGrid, AWS SES, or Resend
     - Or upgrade to Supabase Pro for their production email service

4. **Update email templates**:
   - Navigate to **Authentication** > **Email Templates**
   - Customize confirmation, password reset, and magic link emails
   - Use your domain in links

### Custom Domain for Application

Not required for development, but recommended for production:
- Frontend: Configure in Vercel/Netlify (e.g., `app.yourdomain.com`)
- Backend: Configure in Digital Ocean (e.g., `api.yourdomain.com`)
- Update OAuth redirect URLs to use custom domain

See [Deployment Guide](07-deployment.md#domain-configuration) for detailed DNS setup.

### Development vs Production

**Development** (works without custom domain):
- Supabase default email (limited sends, may go to spam)
- Default Supabase URLs for auth callbacks
- HTTP localhost URLs acceptable

**Production** (custom domain recommended):
- Custom SMTP for reliable email delivery
- Custom domain for professional appearance
- HTTPS required for OAuth and security

Next: [API Configuration](03-api-configuration.md)
