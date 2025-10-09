#!/bin/bash
# Momentus Server Startup Script
# This ensures we're always in the right directory

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "🚀 Starting Momentus server..."
echo "📁 Backend directory: $BACKEND_DIR"

# Change to backend directory and start server
cd "$BACKEND_DIR" || exit 1

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "📋 Copying from .env.example..."
    cp .env.example .env
fi

# Start the server
echo "🌟 Starting server on port 3000..."
node server.js