# Agentation browser extension — install script
# Installs dependencies, builds the extension, and registers Claude Code commands.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$ClaudeDir = Join-Path $env:USERPROFILE ".claude\commands\ag"

Write-Host "=== Agentation Browser Extension ==="
Write-Host ""

# 1. Install dependencies
Write-Host "[1/3] Installing dependencies..."
npm install
Write-Host ""

# 2. Build extension
Write-Host "[2/3] Building extension..."
npm run build
Write-Host ""

# 3. Install Claude Code commands
Write-Host "[3/3] Installing Claude Code commands..."
New-Item -ItemType Directory -Path $ClaudeDir -Force | Out-Null
Copy-Item "$PSScriptRoot\.claude\commands\ag\check.md" "$ClaudeDir\check.md" -Force
Copy-Item "$PSScriptRoot\.claude\commands\ag\loop.md" "$ClaudeDir\loop.md" -Force
Write-Host "Commands installed to $ClaudeDir"
Write-Host ""

Write-Host "=== Done ==="
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open chrome://extensions"
Write-Host "  2. Enable Developer mode"
Write-Host "  3. Click 'Load unpacked' and select: $PSScriptRoot"
Write-Host "  4. Run .\mcp-server.ps1 to start the MCP server"
Write-Host ""
Write-Host "Claude Code commands available:"
Write-Host "  /ag:check  - fetch and fix pending annotations"
Write-Host "  /ag:loop   - continuously poll for annotations"
