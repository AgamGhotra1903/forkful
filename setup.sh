#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🍽️  FORKFUL — Docker Setup & Verification Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✅ Docker is installed ($(docker --version))"

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo "✅ Docker Compose is installed ($(docker-compose --version))"

# Check .env file
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  .env file not found. Creating from .env.docker..."
    if [ ! -f .env.docker ]; then
        echo "❌ Neither .env nor .env.docker found!"
        exit 1
    fi
    cp .env.docker .env
    echo "✅ Created .env from .env.docker"
    echo "   ⚠️  Remember to update sensitive values (JWT_SEC, API keys, etc.)"
fi

# Verify .env has critical values
echo ""
echo "🔐 Checking critical environment variables..."
if grep -q "JWT_SEC=your-super-secret" .env; then
    echo "⚠️  JWT_SEC is still default! Please update .env with a strong secret."
    echo "   Run: sed -i 's/your-super-secret-jwt-key-change-this-in-production/$(openssl rand -base64 32)/g' .env"
fi

# Docker daemon check
echo ""
echo "🐳 Checking Docker daemon..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Please start Docker."
    exit 1
fi
echo "✅ Docker daemon is running"

# Network check
echo ""
echo "🌐 Checking Docker network..."
if ! docker network inspect forkful > /dev/null 2>&1; then
    echo "⚠️  Network 'forkful' does not exist yet (will be created by docker-compose)"
fi

# Build check
echo ""
echo "🔨 Building Docker images..."
docker-compose build --quiet
echo "✅ Docker images built successfully"

# Start services
echo ""
echo "🚀 Starting services..."
docker-compose up -d
echo "✅ Services started"

# Wait for health checks
echo ""
echo "⏳ Waiting for services to be healthy (up to 60 seconds)..."
echo "   This may take a minute on first startup..."
echo ""

# Function to check service health
check_health() {
    local service=$1
    local port=$2
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:$port/health > /dev/null 2>&1; then
            echo "✅ $service is healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        if [ $((attempt % 6)) -eq 0 ]; then
            echo "   Still waiting for $service... ($attempt/60)"
        fi
        sleep 1
    done
    
    echo "⚠️  $service took longer than expected (or failed)"
    return 1
}

# Check all services
echo ""
check_health "Auth Service" 5001
check_health "Restaurant Service" 5002
check_health "Rider Service" 5003
check_health "Admin Service" 5004
check_health "Utils Service" 5005
check_health "Realtime Service" 5006

# Final status check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Final Service Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker-compose ps

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Access Points"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend:              http://localhost:5173"
echo "🔌 API Gateway (Nginx):   http://localhost:80"
echo "📡 RabbitMQ Management:   http://localhost:15672 (guest/guest)"
echo "💾 MongoDB:               mongodb://localhost:27017"
echo "🗃️  Redis CLI:             redis-cli -p 6379"
echo ""
echo "📚 API Endpoints (via Nginx):"
echo "   Auth:       http://localhost:80/api/auth/*"
echo "   Restaurant: http://localhost:80/api/restaurant/*"
echo "   Rider:      http://localhost:80/api/rider/*"
echo "   Admin:      http://localhost:80/api/admin/*"
echo "   Utils:      http://localhost:80/api/util/*"
echo "   Socket.io:  ws://localhost:80/socket.io"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📖 Quick Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "View logs:          docker-compose logs -f"
echo "View service logs:  docker-compose logs -f restaurant"
echo "Stop services:      docker-compose down"
echo "Restart services:   docker-compose restart"
echo "Rebuild images:     docker-compose up -d --build"
echo "Remove all data:    docker-compose down -v"
echo ""

echo "✅ Setup complete! You can now start developing."
echo ""
