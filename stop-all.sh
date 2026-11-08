#!/bin/bash
echo "Stopping all services..."
pkill -f "dist/index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "tsc --watch" 2>/dev/null || true

# Kill any processes still holding service ports
for port in 5001 5002 5003 5004 5005 5006 5173; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    kill -9 $pids 2>/dev/null || true
  fi
done

echo "All services stopped."
