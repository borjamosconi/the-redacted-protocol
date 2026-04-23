@echo off
setlocal enabledelayedexpansion
title RDX Token Deployment - Devnet Testing

echo.
echo ============================================================
echo    REDACTED PROTOCOL - $RDX Token Deployment (DEVNET)
echo    Tokenomics v2.0 - Testing Mode
echo ============================================================
echo.

:: Check if Solana CLI is installed
where solana >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] Solana CLI not found. Installing...
    echo.
    echo Downloading Solana CLI installer...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/solana-labs/solana/releases/download/v1.18.26/solana-install-init-x86_64-pc-windows-msvc.exe' -OutFile '%TEMP%\solana-install-init.exe'" 2>nul
    
    if exist "%TEMP%\solana-install-init.exe" (
        echo Running installer...
        "%TEMP%\solana-install-init.exe" v1.18.26
        echo [!] Please restart this script after installation completes.
        pause
        exit /b
    ) else (
        echo [!] Download failed. Please install Solana CLI manually:
        echo     sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"
        echo.
        echo Or use WSL/Ubuntu on Windows.
        pause
        exit /b 1
    )
)

:: Check spl-token CLI
where spl-token >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] spl-token CLI not found. Installing...
    cargo install spl-token-cli
    if %ERRORLEVEL% neq 0 (
        echo [!] Failed to install spl-token-cli. Please install manually:
        echo     cargo install spl-token-cli
        pause
        exit /b 1
    )
)

echo [OK] Solana CLI: $(solana --version)
echo [OK] spl-token CLI: $(spl-token --version)
echo.

:: Configure devnet
echo [1/8] Configuring Solana devnet...
solana config set --url https://api.devnet.solana.com
if %ERRORLEVEL% neq 0 (
    echo [!] Failed to configure devnet
    pause
    exit /b 1
)
echo [OK] Devnet configured
echo.

:: Check/create keypair
echo [2/8] Checking wallet...
solana address >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] No wallet found. Creating new keypair...
    solana-keygen new --outfile "%USERPROFILE%\.config\solana\id.json" --no-bip39-passphrase
)

set WALLET=$(solana address)
echo [OK] Wallet: %WALLET%
echo.

:: Check balance and airdrop
echo [3/8] Checking SOL balance...
set BALANCE=$(solana balance --lamports)
if "%BALANCE%"=="0" (
    echo [!] Balance is 0. Requesting devnet airdrop...
    solana airdrop 2
    echo [OK] Airdrop completed (2 SOL)
) else (
    echo [OK] Current balance: %BALANCE% lamports
)
echo.

:: Deploy token
echo [4/8] Creating $RDX token mint (9 decimals)...
for /f "delims=" %%a in ('spl-token create-token --decimals 9 --enable-metadata') do set TOKEN_MINT=%%a
echo [OK] Token mint: %TOKEN_MINT%
echo.

echo [5/8] Initializing metadata...
spl-token initialize-metadata %TOKEN_MINT% "Redacted Protocol" "RDX" "https://redacted-protocol.vercel.app/metadata.json"
echo [OK] Metadata set
echo.

echo [6/8] Creating token account...
for /f "delims=" %%a in ('spl-token create-account %TOKEN_MINT%') do set TOKEN_ACCOUNT=%%a
echo [OK] Token account: %TOKEN_ACCOUNT%
echo.

echo [7/8] Minting total supply (1,000,000,000 RDX)...
spl-token mint %TOKEN_MINT% 1000000000
echo [OK] Supply minted
echo.

echo [8/8] Revoking mint authority...
spl-token authorize %TOKEN_MINT% --disable mint
echo [OK] Mint authority revoked
echo.

:: Display results
echo.
echo ============================================================
echo    $RDX TOKEN DEPLOYED ON DEVNET
echo ============================================================
echo.
echo Token Mint:     %TOKEN_MINT%
echo Token Account:  %TOKEN_ACCOUNT%
echo Total Supply:   1,000,000,000 RDX
echo Mint Authority: REVOKED
echo.
echo Explorer: https://explorer.solana.com/address/%TOKEN_MINT%?cluster=devnet
echo.

:: Save deployment info
echo {
echo   "network": "devnet",
echo   "token_name": "Redacted Protocol",
echo   "token_symbol": "RDX",
echo   "token_mint": "%TOKEN_MINT%",
echo   "token_account": "%TOKEN_ACCOUNT%",
echo   "decimals": 9,
echo   "total_supply": "1000000000",
echo   "mint_authority_revoked": true,
echo   "deployed_at": "%DATE% %TIME%"
echo } > token_deployment_devnet.json

echo [OK] Saved to token_deployment_devnet.json
echo.
echo ============================================================
echo    TESTING COMPLETE - The file is breathing...
echo ============================================================
echo.
pause
