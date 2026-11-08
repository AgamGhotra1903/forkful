#!/bin/bash
set -e

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

info()  { echo -e "${GREEN}$1${NC}"; }
warn()  { echo -e "${YELLOW}$1${NC}"; }
die()   { echo -e "${RED}$1${NC}"; exit 1; }
heading() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

SERVICES=(auth restaurant rider admin utils realtime)
mkdir -p logs

# Clean up on exit if terminated
cleanup() {
  echo ""
  warn "Stopping all Forkful services..."
  bash stop-all.sh > /dev/null 2>&1 || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── 0. Ensure Infrastructure Containers Are Running ───────────────────────────
heading "Checking Infrastructure Containers (Redis, RabbitMQ)"
if command -v docker &> /dev/null && docker info &> /dev/null; then
  # Ensure local MongoDB container is NEVER running (Atlas only)
  docker stop forkful_mongodb 2>/dev/null || true
  # Stop any conflicting application containers from Docker
  docker stop forkful_frontend forkful_auth forkful_admin forkful_realtime forkful_rider forkful_nginx forkful_restaurant forkful_utils 2>/dev/null || true
  docker compose up -d rabbitmq redis
  info "✔ Docker infrastructure containers running (Redis, RabbitMQ)"
else
  warn "⚠️  Docker is not running or not found. Ensure Redis (6379) and RabbitMQ (5672) are active."
fi

# ── 1. Stop Lingering Port Processes ──────────────────────────────────────────
bash stop-all.sh > /dev/null 2>&1 || true

# ── 2. Check / Install dependencies ───────────────────────────────────────────
heading "Checking Dependencies"
for svc in "${SERVICES[@]}"; do
  if [ ! -d "services/$svc/node_modules" ]; then
    echo "   → Installing services/$svc..."
    (cd "services/$svc" && npm install --silent 2>&1) || die "npm install failed for $svc"
  else
    echo "   ✔ services/$svc node_modules ready"
  fi
done

if [ ! -d "frontend/node_modules" ]; then
  echo "   → Installing frontend..."
  (cd frontend && npm install --silent 2>&1) || die "npm install failed for frontend"
else
  echo "   ✔ frontend node_modules ready"
fi

# ── 3. Build every backend service ───────────────────────────────────────────
heading "Building Backend Services"
for svc in "${SERVICES[@]}"; do
  echo -n "   🔨 Building $svc... "
  (cd "services/$svc" && npm run build > /dev/null 2>&1) || die "Build failed for $svc"
  echo "done"
done

# ── 4. Start all services ─────────────────────────────────────────────────────
heading "Starting Services"

(cd services/auth       && npm start > ../../logs/auth.log       2>&1) &
PID_AUTH=$!
echo "   ✔  Auth service launched       (PID $PID_AUTH) → http://localhost:5001"

(cd services/restaurant && npm start > ../../logs/restaurant.log 2>&1) &
PID_REST=$!
echo "   ✔  Restaurant service launched (PID $PID_REST) → http://localhost:5002"

(cd services/rider      && npm start > ../../logs/rider.log      2>&1) &
PID_RIDER=$!
echo "   ✔  Rider service launched      (PID $PID_RIDER) → http://localhost:5003"

(cd services/admin      && npm start > ../../logs/admin.log      2>&1) &
PID_ADMIN=$!
echo "   ✔  Admin service launched      (PID $PID_ADMIN) → http://localhost:5004"

(cd services/utils      && npm start > ../../logs/utils.log      2>&1) &
PID_UTILS=$!
echo "   ✔  Utils service launched      (PID $PID_UTILS) → http://localhost:5005"

(cd services/realtime   && npm start > ../../logs/realtime.log   2>&1) &
PID_REALTIME=$!
echo "   ✔  Realtime service launched   (PID $PID_REALTIME) → http://localhost:5006"

(cd frontend            && npm run dev > ../logs/frontend.log   2>&1) &
PID_FRONT=$!
echo "   ✔  Frontend client launched    (PID $PID_FRONT) → http://localhost:5173"

# ── 5. Health Check Verification ──────────────────────────────────────────────
heading "Verifying Service Health"

check_health() {
  local name=$1
  local url=$2
  local max_retries=15
  local count=0
  while [ $count -lt $max_retries ]; do
    if curl -s -f -m 2 "$url" > /dev/null 2>&1; then
      info "   ✅ $name ($url) is HEALTHY"
      return 0
    fi
    count=$((count + 1))
    sleep 1
  done
  warn "   ⚠️  $name ($url) did not respond in $max_retries seconds"
  return 1
}

sleep 2
check_health "Auth Service"       "http://localhost:5001/health" || true
check_health "Restaurant Service" "http://localhost:5002/health" || true
check_health "Rider Service"      "http://localhost:5003/health" || true
check_health "Admin Service"      "http://localhost:5004/health" || true
check_health "Utils Service"      "http://localhost:5005/health" || true
check_health "Realtime Service"   "http://localhost:5006/health" || true
check_health "Frontend Client"    "http://localhost:5173" || true

echo ""
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "✨ All Forkful services are running successfully!"
info "🌐 Frontend App:     http://localhost:5173"
info "📋 Admin Dashboard:  http://localhost:5173/admin"
info "📜 Service Logs:     tail -f logs/<service>.log"
info "🛑 Stop:             ./stop-all.sh (or Ctrl+C)"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Keep running in background so services persist
wait
