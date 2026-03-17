@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0mcp-server.ps1" %*
pause
