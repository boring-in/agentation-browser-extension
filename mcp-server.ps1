# Agentation MCP server toggle
# Usage: .\mcp-server.ps1 [port]
# Starts if not running, stops if running.

param(
    [int]$Port = 4747
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$PidFile = Join-Path $PSScriptRoot ".mcp-server.pid"
$LogFile = Join-Path $PSScriptRoot ".mcp-server.log"

# Find the node process listening on our port
function Find-ServerPid {
    $line = netstat -ano | Select-String ":\b$Port\b\s+.*LISTENING" | Select-Object -First 1
    if ($line) { return ($line -split '\s+')[-1] }
    return $null
}

# Check if already running (by PID file or by port)
$runningPid = $null
if (Test-Path $PidFile) {
    $savedPid = Get-Content $PidFile
    try {
        Get-Process -Id $savedPid -ErrorAction Stop | Out-Null
        $runningPid = $savedPid
    } catch {
        Remove-Item $PidFile -Force
    }
}
if (-not $runningPid) {
    $runningPid = Find-ServerPid
}

if ($runningPid) {
    taskkill /PID $runningPid /T /F 2>$null | Out-Null
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Write-Host "MCP server stopped (PID $runningPid)"
    exit
}

# Check for updates
Write-Host "Checking for agentation updates..."
$installed = node -e "console.log(require('./node_modules/agentation/package.json').version)" 2>$null
$latest = npm view agentation version 2>$null

if ($installed -ne $latest -and $latest) {
    Write-Host "Updating: $installed -> $latest"
    npm install agentation@latest
    npm run build
    Write-Host "Reload the extension in chrome://extensions"
    Write-Host ""
} else {
    Write-Host "agentation $installed is up to date."
}

# Start
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npx --yes agentation-mcp server --port $Port > `"$LogFile`" 2>&1" `
    -WindowStyle Hidden

# Wait and find the actual node process by port
Start-Sleep -Seconds 3
$serverPid = Find-ServerPid

if ($serverPid) {
    $serverPid | Out-File $PidFile -NoNewline
    Write-Host "MCP server started (PID $serverPid, port $Port)"
} else {
    Write-Host "MCP server failed to start. Logs:"
    if (Test-Path $LogFile) { Get-Content $LogFile -Tail 5 }
}
