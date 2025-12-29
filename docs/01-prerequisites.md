# Prerequisites

**Estimated time**: 30-45 minutes

## Required Software

Install the following before proceeding:

### Node.js 18+

**macOS** (using Homebrew):
```bash
brew install node@18
node --version  # Should show v18.x.x or higher
npm --version
```

**Windows**:
1. Download installer from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow prompts
3. Verify installation:
```bash
node --version  # Should show v18.x.x or higher
npm --version
```

**Linux** (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### Python 3.11+

**macOS** (using Homebrew):
```bash
brew install python@3.11
python3 --version  # Should show 3.11.x or higher
pip3 --version
```

**Windows**:
1. Download installer from [python.org](https://python.org/)
2. Run installer and check "Add Python to PATH"
3. Verify installation:
```bash
python --version  # Should show 3.11.x or higher
pip --version
```

**Linux** (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install python3.11 python3-pip
python3 --version
pip3 --version
```

### Git

**macOS** (using Homebrew):
```bash
brew install git
git --version
```

**Windows**:
1. Download from [git-scm.com](https://git-scm.com/)
2. Run installer with default settings
3. Verify installation:
```bash
git --version
```

**Linux** (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install git
git --version
```

**Configure Git** (all platforms):
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Required Accounts

Create these accounts before starting (Phase 0 - approximately 30 minutes total):

### Supabase
Sign up at [supabase.com](https://supabase.com)
- Free tier is sufficient for development
- Required for database, authentication, and file storage
- Save your password securely - you'll need it for database access

### Google Cloud
Sign up at [console.cloud.google.com](https://console.cloud.google.com)
- Required for Gemini AI API
- Free tier includes 60 requests/minute and 1,500 requests/day
- API key starts with `AIzaSy`

### USDA (Optional)
Sign up at [fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html)
- Free food database API with 400,000+ foods
- Can use `DEMO_KEY` for testing (30 requests/hour limit)
- Personal API key provides 1,000 requests/hour

## Recommended Development Tools

### Code Editor
**VS Code** (recommended) - Download from [code.visualstudio.com](https://code.visualstudio.com/)

Recommended extensions:
- Python (Microsoft)
- ESLint (Microsoft)
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- GitLens

### Database GUI (Optional)
Choose one for easier database inspection:
- **Supabase Dashboard** (built-in, web-based) - Recommended for beginners
- **TablePlus** (Mac/Windows, free tier available)
- **DBeaver** (Free, open-source, cross-platform)

### API Testing Tools (Optional)
Useful for testing backend endpoints:
- **Thunder Client** (VS Code extension) - Lightweight and integrated
- **Postman** (Standalone app, free)
- **Insomnia** (Standalone app, free)

## Clone Repository

```bash
git clone https://github.com/yourusername/nutrisync.git
cd nutrisync
```

Next: [Database Setup](02-database-setup.md)
