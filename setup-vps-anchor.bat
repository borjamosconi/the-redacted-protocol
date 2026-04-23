@echo off
cd /d "%~dp0the_redacted_protocol"
call load-creds.bat
if errorlevel 1 exit /b 1

set VPS=%VPS_USER%@%VPS_HOST%

echo.
echo ========================================
echo   REDACTED PROTOCOL — VPS Anchor Setup
echo ========================================
echo.
echo STEP 1: Copying SSH key to VPS...
echo.
echo When prompted, enter password: %VPS_PASS%
echo.
pause

type %USERPROFILE%\.ssh\id_ed25519.pub | ssh %VPS_HOST% "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

echo.
echo STEP 2: Testing passwordless SSH...
echo.
ssh -o BatchMode=yes -o ConnectTimeout=10 %VPS_HOST% "echo 'SSH OK'"

echo.
echo STEP 3: Installing Anchor & Solana on VPS...
echo.
ssh %VPS_HOST% "
echo '=== Updating system ==='
apt-get update && apt-get install -y build-essential pkg-config libssl-dev libudev-dev curl git

echo '=== Installing Rust ==='
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source \$HOME/.cargo/env

echo '=== Installing Solana CLI ==='
sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.15/install)\"

echo '=== Installing Anchor (avm) ==='
cargo install --git https://github.com/solana-foundation/anchor --tag v0.30.1 anchor-cli --locked

echo '=== Creating Solana keypair ==='
mkdir -p /root/.config/solana
solana-keygen new --no-bip39-passphrase --force

echo '=== Setting up project directory ==='
mkdir -p /root/the_redacted_protocol

echo '=== Done! ==='
echo 'Anchor and Solana installed on VPS'
"

echo.
echo STEP 4: Syncing contracts to VPS...
echo.
scp -r "%CD%\contracts" %VPS_HOST%:/root/the_redacted_protocol/

echo.
echo ========================================
echo   SETUP COMPLETE
echo ========================================
echo.
echo NEXT: Run deploy-contracts.bat to build and deploy
echo.
pause
