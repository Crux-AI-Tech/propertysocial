#!/bin/bash

# Start development servers
echo "🚀 Starting EU Real Estate Portal development servers..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start API server
echo "🔧 Starting API server on port 7500..."
cd apps/api && npm run dev &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start web server
echo "🌐 Starting web server on port 6500..."
cd apps/web && npm run dev &
WEB_PID=$!

echo ""
echo "✅ Development servers started!"
echo "🔗 API: http://localhost:7500"
echo "🔗 Web: http://localhost:6500"
echo "🔗 Health: http://localhost:7500/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait
