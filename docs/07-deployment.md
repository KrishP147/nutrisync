# Deployment

## Production Environment Variables

### Backend (Digital Ocean)

Set these in Digital Ocean App Platform dashboard under **Settings** > **Environment Variables**:

```
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_KEY=your_anon_key
GOOGLE_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_key
```

Mark `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_API_KEY` as encrypted/secret.

### Frontend (Vercel)

Set these in Vercel dashboard under **Project Settings** > **Environment Variables**:

```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://api.yourdomain.com
```

Select all environments: Production, Preview, Development.

## Backend Deployment

### Using Deploy Script

The repository includes an automated deployment script for Digital Ocean.

```bash
cd backend
./deploy.sh
```

This script:
- Updates system packages
- Installs Python and dependencies
- Configures Nginx reverse proxy
- Sets up systemd service
- Configures SSL with Certbot

### Manual Steps After Deployment

1. SSH into your server
2. Edit `/opt/nutrisync/backend/.env` with actual API keys
3. Restart service:
```bash
systemctl restart nutrisync
```

4. Configure SSL:
```bash
certbot --nginx -d api.yourdomain.com
```

5. Verify:
```bash
curl https://api.yourdomain.com/health
```

### Configuration Files

**Systemd service** (`backend/nutrisync.service`):
- Manages backend process
- Auto-restart on failure
- Environment variable loading

**Nginx config** (`backend/nginx.conf`):
- Reverse proxy configuration
- Security headers
- File upload limits
- WebSocket support

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

Or connect repository to Vercel dashboard for automatic deployments on push.

### Configuration

The `vercel.json` file at repository root handles:
- Build configuration
- Output directory
- Framework detection
- Routing rules

## Domain Configuration

### Backend (api.yourdomain.com)

Point A record to your Digital Ocean droplet IP:
```
Type: A
Name: api
Value: [droplet-ip-address]
TTL: 3600
```

### Frontend (yourdomain.com)

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

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on each push:

1. **Frontend Tests**: Linting and Vitest tests
2. **Backend Tests**: pytest with coverage
3. **Security Scan**: Trivy vulnerability scanning
4. **Deploy Frontend**: Automatic Vercel deployment (main branch)
5. **Deploy Backend**: Automatic Digital Ocean deployment (main branch)

### Required GitHub Secrets

Configure in repository **Settings** > **Secrets and variables** > **Actions**:

```
GOOGLE_API_KEY          # For tests
SUPABASE_URL            # For tests
SUPABASE_KEY            # For tests
VERCEL_TOKEN            # For frontend deployment
VERCEL_ORG_ID           # For frontend deployment
VERCEL_PROJECT_ID       # For frontend deployment
DIGITALOCEAN_ACCESS_TOKEN # For backend deployment
CODECOV_TOKEN           # For coverage reports (optional)
```

## Monitoring

### Backend Health Check

```bash
curl https://api.yourdomain.com/health
```

### View Logs

**Systemd service logs**:
```bash
journalctl -u nutrisync -f
```

**Nginx logs**:
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Vercel Logs

View in Vercel dashboard under **Deployments** > Select deployment > **Logs**

## Troubleshooting

### Backend not responding

Check service status:
```bash
systemctl status nutrisync
```

Restart if needed:
```bash
systemctl restart nutrisync
```

### Frontend build fails

Check build logs in Vercel dashboard. Common issues:
- Missing environment variables
- Incorrect `VITE_` prefix
- Build timeout (increase in Vercel settings)

### SSL certificate errors

Renew certificate:
```bash
certbot renew
nginx -s reload
```

### Database connection errors

Verify:
- Supabase project is running
- Correct `SUPABASE_URL` in environment variables
- Network connectivity from deployment platform to Supabase
