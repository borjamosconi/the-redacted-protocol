@echo off
REM ═══════════════════════════════════════════════════════════════
REM  LAUNCH-AGENT-BG.bat — Launches AGENT-LOOP.ps1 detached
REM  Call once. The agent runs in background until kill.
REM ═══════════════════════════════════════════════════════════════

start "REDACTED-AGENT" /MIN powershell.exe -NoProfile -WindowStyle Minimized -ExecutionPolicy Bypass -File "%~dp0AGENT-LOOP.ps1"

echo Agent launched in background (minimized window).
echo To stop it: close the minimized powershell window from taskbar.
