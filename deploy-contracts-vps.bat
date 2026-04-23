@echo off
cd /d "%~dp0the_redacted_protocol"
call load-creds.bat
if errorlevel 1 exit /b 1

set VPS=%VPS_USER%@%VPS_HOST%

echo.
echo ========================================
echo   REDACTED PROTOCOL — Deploy Contracts
echo ========================================
echo.
echo This will:
echo   1. Sync contracts to VPS
echo   2. Build with Anchor on VPS
echo   3. Deploy to Solana devnet
echo.
echo Press Ctrl+C to cancel, or wait to continue...
pause

echo.
echo STEP 1: Syncing contracts...
echo.
scp -r "%CD%\contracts\*" %VPS_HOST%:/root/the_redacted_protocol/contracts/

echo.
echo STEP 2: Building contracts on VPS (this takes a while)...
echo.
ssh %VPS_HOST% "
source \$HOME/.cargo/env
export PATH=\$HOME/.local/share/solana/install/active_release/bin:\$PATH
export PATH=\$HOME/.cargo/bin:\$PATH

cd /root/the_redacted_protocol/contracts

echo '=== Anchor version ==='
anchor --version

echo '=== Solana version ==='
solana --version

echo '=== Building contracts ==='
anchor build

echo '=== Deploying to devnet ==='
solana config set --url devnet
solana airdrop 2 || true
anchor deploy --provider.cluster devnet

echo '=== DONE ==='
"

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE (if no errors)
echo ========================================
echo.
pause
