@echo off
REM ═══════════════════════════════════════════════════════════════
REM  build-contracts.bat — Build Solana contracts in Docker
REM ═══════════════════════════════════════════════════════════════

set PROJECT_DIR=%~dp0
set CONTRACTS_DIR=%PROJECT_DIR%contracts
set OUTPUT_DIR=%PROJECT_DIR%anchor-build-output

echo.
echo ========================================
echo   REDACTED PROTOCOL — Build Contracts
echo ========================================
echo.

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo Building contracts in Docker container...
echo This will take 5-10 minutes on first run (cached afterwards).
echo.

docker run --rm ^
  -v "%CONTRACTS_DIR%:/workspace/contracts" ^
  -v "%OUTPUT_DIR%:/workspace/output" ^
  -w /workspace/contracts ^
  ubuntu:22.04 ^
  bash -c "
    set -e
    export PATH=/usr/local/cargo/bin:/opt/solana/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    
    echo '=== Installing deps ==='
    apt-get update -qq && apt-get install -y -qq build-essential pkg-config libssl-dev libudev-dev curl git ca-certificates >/dev/null 2>&1
    echo '✅ System deps installed'
    
    echo '=== Installing Rust 1.79 ==='
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.79.0 >/dev/null 2>&1
    source /root/.cargo/env
    echo '✅ Rust: ' $(rustc --version)
    
    echo '=== Installing Solana ==='
    curl -k -L 'https://release.anza.xyz/v1.18.15/solana-release-x86_64-unknown-linux-gnu.tar.bz2' -o /tmp/solana.tar.bz2
    tar -xjf /tmp/solana.tar.bz2 -C /tmp/
    mv /tmp/solana-release /opt/solana
    rm /tmp/solana.tar.bz2
    echo '✅ Solana: ' $(/opt/solana/bin/solana --version ^| head -1)
    
    echo '=== Installing Anchor (15-20 min) ==='
    cargo install --git https://github.com/solana-foundation/anchor --tag v0.30.1 anchor-cli --locked
    echo '✅ Anchor: ' $(anchor --version)
    
    echo ''
    echo '=== Building contracts ==='
    cd /workspace/contracts
    anchor build
    
    echo ''
    echo '=== Copying build artifacts ==='
    mkdir -p /workspace/output
    cp -r /workspace/contracts/target/deploy/*.so /workspace/output/ 2>/dev/null || true
    cp -r /workspace/contracts/target/idl /workspace/output/ 2>/dev/null || true
    cp -r /workspace/contracts/target/types /workspace/output/ 2>/dev/null || true
    
    echo ''
    echo '============================================'
    echo '✅ BUILD COMPLETE'
    echo '============================================'
    echo 'Artifacts saved to: %OUTPUT_DIR%'
    ls -la /workspace/output/
  "

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo   BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Artifacts in: %OUTPUT_DIR%
    echo.
    echo NEXT: Run deploy-to-vps.bat to deploy to VPS
) else (
    echo ========================================
    echo   BUILD FAILED
    echo ========================================
)
echo.
pause
