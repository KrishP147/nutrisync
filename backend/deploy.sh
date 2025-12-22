#!/bin/bash

# NutriSync Digital Ocean Deployment Script
# Run this script on your Digital Ocean droplet as root

set -e  # Exit on any error

echo "=== NutriSync Digital Ocean Deployment ==="
echo ""

# Update system
echo "Step 1: Updating system..."
apt update && apt upgrade -y

# Install Python 3 and venv
echo "Step 2: Installing Python..."
apt install python3 python3-venv python3-pip -y

# Install Nginx
echo "Step 3: Installing Nginx..."
apt install nginx -y

# Install Certbot for SSL
echo "Step 4: Installing Certbot..."
apt install certbot python3-certbot-nginx -y

# Install Git
echo "Step 5: Installing Git..."
apt install git -y

# Clone repository
echo "Step 6: Cloning repository..."
cd /opt
if [ -d "nutrisync" ]; then
    echo "Directory already exists. Pulling latest changes..."
    cd nutrisync
    git pull
else
    git clone https://github.com/KrishP147/nutrisync.git
    cd nutrisync
fi

# Navigate to backend directory
cd backend

# Setup Python environment
echo "Step 7: Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
echo "Step 8: Creating .env file..."
if [ ! -f .env ]; then
    echo "Creating .env file - YOU NEED TO ADD YOUR KEYS!"
    cat > .env << 'EOF'
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_API_KEY=your_google_api_key
USDA_API_KEY=your_usda_api_key
EOF
    echo "⚠️  IMPORTANT: Edit /opt/nutrisync/backend/.env with your actual keys!"
    echo "Run: nano /opt/nutrisync/backend/.env"
else
    echo ".env file already exists"
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Setup systemd service
echo "Step 9: Setting up systemd service..."
cp nutrisync.service /etc/systemd/system/nutrisync.service
systemctl daemon-reload
systemctl enable nutrisync
systemctl restart nutrisync

# Wait a moment for service to start
sleep 3

# Check service status
echo "Step 10: Checking service status..."
systemctl status nutrisync --no-pager

# Configure Nginx
echo "Step 11: Configuring Nginx..."
cp nginx.conf /etc/nginx/sites-available/nutrisync
ln -sf /etc/nginx/sites-available/nutrisync /etc/nginx/sites-enabled/nutrisync

# Remove default nginx site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

echo ""
echo "=== Deployment Steps Completed ==="
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Edit your environment variables:"
echo "   nano /opt/nutrisync/backend/.env"
echo ""
echo "2. Restart the service after updating .env:"
echo "   systemctl restart nutrisync"
echo ""
echo "3. Setup SSL certificate:"
echo "   certbot --nginx -d api.nutrisync.me"
echo ""
echo "4. Test your API:"
echo "   curl https://api.nutrisync.me/health"
echo ""
echo "=== Useful Commands ==="
echo "View logs: journalctl -u nutrisync -f"
echo "Restart service: systemctl restart nutrisync"
echo "Check status: systemctl status nutrisync"
echo ""
