#!/bin/bash

# Aperture Global Website Server Startup Script

echo "🚀 Starting Aperture Global Website Server..."

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found"
    echo "🌐 Starting server on http://localhost:3000"
    echo "📁 Serving files from: $(pwd)"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "----------------------------------------"
    python3 simple-server.py
elif command -v node &> /dev/null; then
    echo "✅ Node.js found"
    echo "📦 Installing dependencies..."
    npm install
    echo "🌐 Starting server on http://localhost:3000"
    echo "📁 Serving files from: $(pwd)"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "----------------------------------------"
    npm start
else
    echo "❌ Neither Python 3 nor Node.js found"
    echo "Please install one of the following:"
    echo "1. Python 3: https://www.python.org/downloads/"
    echo "2. Node.js: https://nodejs.org/"
    exit 1
fi
