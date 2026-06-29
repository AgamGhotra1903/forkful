#!/bin/bash
set -e

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

info()  { echo -e "${GREEN}$1${NC}"; }
warn()  { echo -e "${YELLOW}$1${NC}"; }
die()   { echo -e "${RED}$1${NC}"; exit 1; }

SERVICES=(auth restaurant rider admin utils realtime)
mkdir -p logs

# ── 1. Install dependencies ───────────────────────────────────────────────────
info "\n📦 Installing backend dependencies..."
for svc in "${SERVICES[@]}"; do
  echo "   → $svc"
  (cd "services/$svc" && npm install --silent 2>&1) || die "npm install failed for $svc"
done

info "📦 Installing frontend dependencies..."
(cd frontend && npm install --silent 2>&1) || die "npm install failed for frontend"

# ── 2. Build every backend service ───────────────────────────────────────────
info "\n🔨 Building backend services..."
for svc in "${SERVICES[@]}"; do
  echo "   → $svc"
  (cd "services/$svc" && npm run build 2>&1) || die "Build failed for $svc"
done

# ── 3. Start services using `npm start` (node dist/index.js) ─────────────────
# We intentionally do NOT use `npm run dev` here.
# `npm run dev` runs:  concurrently "tsc --watch" "node --watch dist/index.js"
# tsc --watch IMMEDIATELY recompiles on start, briefly deleting dist/ output.
# node --watch sees dist/index.js disappear and crashes.
# Since we already built above, `npm start` is stable and correct for local use.
info "\n🚀 Starting all services...\n"

(cd services/auth       && npm start > ../../logs/auth.log       2>&1) & info "   ✔  Auth service       → http://localhost:5001"
(cd services/restaurant && npm start > ../../logs/restaurant.log 2>&1) & info "   ✔  Restaurant service → http://localhost:5002"
(cd services/rider      && npm start > ../../logs/rider.log      2>&1) & info "   ✔  Rider service      → http://localhost:5003"
(cd services/admin      && npm start > ../../logs/admin.log      2>&1) & info "   ✔  Admin service      → http://localhost:5004"
(cd services/utils      && npm start > ../../logs/utils.log      2>&1) & info "   ✔  Utils service      → http://localhost:5005"
(cd services/realtime   && npm start > ../../logs/realtime.log   2>&1) & info "   ✔  Realtime service   → http://localhost:5006"

# Give backend services a moment to bind their ports before frontend starts
sleep 2

(cd frontend && npm run dev > ../logs/frontend.log 2>&1) &           info "   ✔  Frontend            → http://localhost:5173"

echo ""
info "✅ All services started."
warn "   Logs: tail -f logs/<service>.log"
warn "   Stop: bash stop-all.sh   (or kill %1 %2 %3 %4 %5 %6 %7)"
