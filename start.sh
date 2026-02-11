#!/bin/bash

# Start script for thepopebot event handler

set -e

PORT=3001
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVENT_HANDLER_DIR="$SCRIPT_DIR/event_handler"

cd "$EVENT_HANDLER_DIR"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Error: .env file not found in event_handler/"
    echo "Copy .env.example to .env and configure your environment variables:"
    echo "  cp .env.example .env"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check for ngrok
if ! command -v ngrok &> /dev/null; then
    echo "Error: ngrok is not installed"
    echo "Install it from: https://ngrok.com/download"
    exit 1
fi

# Cleanup function to kill background processes on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $NGROK_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start ngrok in the background
echo "Starting ngrok on port $PORT..."
ngrok http $PORT --log=stdout > /dev/null &
NGROK_PID=$!

# Wait for ngrok to start and get the public URL
sleep 2
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$NGROK_URL" ]; then
    echo "ngrok URL: $NGROK_URL"
else
    echo "Warning: Could not get ngrok URL (check http://localhost:4040)"
fi

# Start the server
echo "Starting event handler on port $PORT..."
PORT=$PORT npm start
