# Google OAuth Setup

Optional: Enable "Sign in with Google" functionality.

## Create OAuth Credentials

### Configure Consent Screen

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project or select existing
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Select **External** user type
5. Fill in required fields:
   - **App name**: NutriSync
   - **User support email**: Your email
   - **Developer contact**: Your email
6. Click **Save and Continue**
7. On Scopes page, click **Save and Continue** (default scopes are sufficient)
8. Add test users (your email and any testers)
9. Click **Save and Continue**

### Create OAuth Client

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Fill in:
   - **Name**: NutriSync Web App
   - **Authorized JavaScript origins**: Add `http://localhost:5173` and `http://localhost:3000`
   - **Authorized redirect URIs**: See below

### Get Supabase Callback URL

1. Go to your Supabase dashboard
2. Navigate to **Authentication** > **Providers** > **Google**
3. Copy the **Callback URL** (format: `https://[project-ref].supabase.co/auth/v1/callback`)

### Add Redirect URI

Back in Google Cloud Console:
1. Under **Authorized redirect URIs**, add the Supabase callback URL
2. Click **Create**
3. Copy the **Client ID** and **Client Secret**

## Configure Supabase

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Google** and toggle it on
3. Enter:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Click **Save**

## Test OAuth Flow

1. Start your frontend application
2. Navigate to login page
3. Click **Sign in with Google**
4. Select your Google account
5. Grant permissions
6. You should be redirected back and logged in

## Production Configuration

### Publish OAuth App

For production use:
1. Go to **OAuth consent screen** in Google Cloud Console
2. Click **Publish App**
3. Confirm

This allows any Google user to sign in (not just test users).

### Add Production URLs

In **Credentials** > Your OAuth Client:

**Authorized JavaScript origins**:
- Add your production domain (e.g., `https://nutrisync.me`)

**Authorized redirect URIs**:
- Supabase callback URL remains the same for production

## Troubleshooting

### "Error 400: redirect_uri_mismatch"

The redirect URI in Google Console must exactly match the Supabase callback URL.

Fix:
1. Copy exact callback URL from Supabase **Authentication** > **Providers** > **Google**
2. Add to Google Cloud Console authorized redirect URIs
3. Include protocol, domain, and full path

### "Error 403: access_denied"

Your Google account is not authorized.

Fix:
- Add your email to test users in OAuth consent screen
- Or publish the app for public use

### "This app hasn't been verified"

Normal for unpublished apps.

For testing:
- Click **Advanced** > **Go to [App Name] (unsafe)**

For production:
- Publish the app in OAuth consent screen
- Basic scopes (email, profile) don't require Google verification

Next: [Testing](06-testing.md)
