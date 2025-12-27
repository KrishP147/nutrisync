# Prerequisites

## Required Software

Install the following before proceeding:

### Node.js 18+
Download from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version  # Should show v18.0.0 or higher
npm --version
```

### Python 3.11+
Download from [python.org](https://python.org/)

Verify installation:
```bash
python --version  # Should show 3.11.0 or higher
pip --version
```

### Git
Download from [git-scm.com](https://git-scm.com/)

Verify installation:
```bash
git --version
```

## Required Accounts

Create accounts for these services:

### Supabase
Sign up at [supabase.com](https://supabase.com)
- Free tier is sufficient for development
- Required for database, authentication, and file storage

### Google Cloud
Sign up at [console.cloud.google.com](https://console.cloud.google.com)
- Required for Gemini AI API
- Free tier includes 1,500 requests per day

### USDA (Optional)
Sign up at [fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html)
- Free food database API
- Can use `DEMO_KEY` for testing (30 requests/hour limit)

## Clone Repository

```bash
git clone https://github.com/yourusername/nutrisync.git
cd nutrisync
```

Next: [Database Setup](02-database-setup.md)
