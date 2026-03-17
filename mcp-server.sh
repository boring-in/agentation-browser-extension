#!/usr/bin/env bash
# Agentation MCP server toggle
# Usage: ./mcp-server.sh [port]
# Starts if not running, stops if running.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.mcp-server.pid"
LOG_FILE="$SCRIPT_DIR/.mcp-server.log"
PORT="${1:-4747}"

cd "$SCRIPT_DIR"

# Check if already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo "MCP server stopped (PID $PID)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

# Check for updates
echo "Checking for agentation updates..."
INSTALLED=$(node -e "console.log(require('./node_modules/agentation/package.json').version)" 2>/dev/null || echo "none")
LATEST=$(npm view agentation version 2>/dev/null || echo "$INSTALLED")

if [ "$INSTALLED" != "$LATEST" ]; then
  echo "Updating: $INSTALLED -> $LATEST"
  npm install agentation@latest
  npm run build
  echo "Reload the extension in chrome://extensions"
  echo ""
else
  echo "agentation $INSTALLED is up to date."
fi

# Start
nohup npx --yes agentation-mcp server --port "$PORT" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "MCP server started (PID $!, port $PORT)"
