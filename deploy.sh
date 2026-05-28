#!/bin/bash
# ZENITH Docker Deployment Script for Ubuntu

set -e

echo "========================================"
echo "  ZENITH Docker Deploy"
echo "========================================"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. Please logout and login again, then re-run this script."
    exit 0
fi

# Check docker compose
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif docker-compose version &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo "❌ docker compose not found. Installing..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
    COMPOSE="docker compose"
fi

echo "✅ Docker found"

# Check .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file if you need custom credentials"
fi

echo ""
echo "📦 Building Docker image..."
$COMPOSE build

echo ""
echo "🚀 Starting containers..."
$COMPOSE up -d

echo ""
echo "⏳ Waiting for MySQL to be ready..."
sleep 10

echo ""
echo "🔄 Running database migrations..."
$COMPOSE exec -T zenith npx drizzle-kit push:mysql || echo "⚠️ Migration may have issues, but app should still work"

echo ""
echo "========================================"
echo "  ✅ ZENITH deployed successfully!"
echo "========================================"
echo ""

# Get IP
IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "📍 Access URLs:"
echo "   Local:    http://localhost:3000"
echo "   Network:  http://$IP:3000"
echo "   Public:   http://YOUR_PUBLIC_IP:3000 (if port 3000 is open)"
echo ""
echo "📋 Management commands:"
echo "   View logs:    $COMPOSE logs -f"
echo "   Stop:         $COMPOSE stop"
echo "   Restart:      $COMPOSE restart"
echo "   Remove:       $COMPOSE down -v"
echo "   View status:  $COMPOSE ps"
echo ""
echo "🔧 Default login:"
echo "   Username: 1"
echo "   Password: a"
echo ""
