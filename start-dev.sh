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
echo "🔧 Starting API server on port 8020..."
cd apps/api && npm run dev &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start web server
echo "🌐 Starting web server on port 5174..."
cd apps/web && npm run dev &
WEB_PID=$!

echo ""
echo "✅ Development servers started!"
echo "🔗 API: http://localhost:8020"
echo "🔗 Web: http://localhost:5174"
echo "🔗 Health: http://localhost:8020/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait
