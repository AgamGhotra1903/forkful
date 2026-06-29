#!/bin/bash
echo "Stopping all services..."
pkill -f "dist/index.js"
pkill -f "vite"
pkill -f "tsc --watch"
echo "All services stopped."
