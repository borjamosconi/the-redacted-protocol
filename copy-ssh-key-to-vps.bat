@echo off
REM ═══════════════════════════════════════════════════════════════
REM  copy-ssh-key-to-vps.bat — Copy SSH key to VPS
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0the_redacted_protocol"
call load-creds.bat
if errorlevel 1 exit /b 1

set VPS_HOST=%VPS_USER%@%VPS_HOST%
set PUBKEY=%USERPROFILE%\.ssh\id_ed25519.pub

echo.
echo ========================================
echo   Copying SSH key to VPS
echo ========================================
echo.
echo You will be prompted for the VPS password ONCE.
echo.

type "%PUBKEY%" | ssh %VPS_HOST% "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

echo.
echo ========================================
echo   Testing passwordless SSH...
echo ========================================
echo.

ssh -o BatchMode=yes -o ConnectTimeout=10 %VPS_HOST% "echo SUCCESS: SSH key configured!"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   SSH KEY CONFIGURED SUCCESSFULLY!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   FAILED - Please try manually:
    echo   ssh-copy-id %VPS_HOST%
    echo ========================================
)

echo.
pause
