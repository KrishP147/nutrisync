# Database Setup

This guide covers setting up Supabase as your database, authentication, and storage provider.

## Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Fill in:
   - **Name**: nutrisync
   - **Database Password**: Generate and save securely
   - **Region**: Select closest to your users
4. Click **Create new project** (takes 2-3 minutes)

## Gather API Credentials

Navigate to **Project Settings** > **API**:

Copy these three values:
- **Project URL** - `https://[project-ref].supabase.co`
- **anon public** - Long JWT token (safe for frontend)
- **service_role** - Long JWT token (backend only, keep secret)

## Run Database Migrations

Navigate to **SQL Editor** in Supabase dashboard.

Run each migration file from `backend/migrations/` in sequential order. For each file:
1. Open the file in your editor
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. Verify success before proceeding to next file

**Required order**:
```
001_setup_functions.sql
002_user_management.sql
003_user_enhancements.sql
004_weight_tracking.sql
005_meal_tracking.sql
006_meal_enhancements.sql
007_achievements.sql
008_fasting.sql
```

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
- user_profile
- user_goals
- weight_history
- meals
- meal_components
- user_foods
- daily_achievements
- fasting_sessions

Navigate to **Storage**. You should see:
- meal-photos (bucket with 3 policies)

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
