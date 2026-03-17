#!/usr/bin/env bash
# Agentation browser extension — install script
# Installs dependencies, builds the extension, and registers Claude Code commands.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude/commands/ag"

cd "$SCRIPT_DIR"

echo "=== Agentation Browser Extension ==="
echo ""

# 1. Install dependencies
echo "[1/3] Installing dependencies..."
npm install
echo ""

# 2. Build extension
echo "[2/3] Building extension..."
npm run build
echo ""

# 3. Install Claude Code commands
echo "[3/3] Installing Claude Code commands..."
mkdir -p "$CLAUDE_DIR"
cp "$SCRIPT_DIR/.claude/commands/ag/check.md" "$CLAUDE_DIR/check.md"
cp "$SCRIPT_DIR/.claude/commands/ag/loop.md" "$CLAUDE_DIR/loop.md"
echo "Commands installed to $CLAUDE_DIR"
echo ""

echo "=== Done ==="
echo ""
echo "Next steps:"
echo "  1. Open chrome://extensions"
echo "  2. Enable Developer mode"
echo "  3. Click 'Load unpacked' and select: $SCRIPT_DIR"
echo "  4. Run ./mcp-server.sh to start the MCP server"
echo ""
echo "Claude Code commands available:"
echo "  /ag:check  — fetch and fix pending annotations"
echo "  /ag:loop   — continuously poll for annotations"
