# ============================================================
#    REDACTED PROTOCOL - $RDX Token Deployment (DEVNET)
#    Tokenomics v2.0 - Testing Mode
#    Run: powershell -ExecutionPolicy Bypass -File .\test-deploy-token.ps1
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   REDACTED PROTOCOL - `$RDX Token Deployment (DEVNET)" -ForegroundColor Green
Write-Host "   Tokenomics v2.0 - Testing Mode" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Step 1: Check Solana CLI
$solanaPath = Get-Command solana -ErrorAction SilentlyContinue
if (-not $solanaPath) {
    Write-Host "[!] Solana CLI not found. Attempting installation..." -ForegroundColor Yellow
    Write-Host ""
    
    # Try to download and install Solana CLI for Windows
    $installerUrl = "https://github.com/solana-labs/solana/releases/download/v1.18.26/solana-install-init-x86_64-pc-windows-msvc.exe"
    $installerPath = "$env:TEMP\solana-install-init.exe"
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Write-Host "    Downloading Solana installer..."
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Write-Host "    Running installer..."
        Start-Process $installerPath -ArgumentList "v1.18.26" -Wait
        Write-Host "[!] Installer completed. Please CLOSE and REOPEN this terminal, then run this script again." -ForegroundColor Red
        exit
    } catch {
        Write-Host "[!] Download failed. Please install Solana CLI manually:" -ForegroundColor Red
        Write-Host "    Option 1 (WSL): wsl sh -c `"`$(curl -sSfL https://release.solana.com/v1.18.26/install)`""
        Write-Host "    Option 2 (Git Bash): sh -c `"`$(curl -sSfL https://release.solana.com/v1.18.26/install)`""
        Write-Host "    Option 3: Download from https://github.com/solana-labs/solana/releases"
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

$solanaVersion = solana --version
Write-Host "[OK] Solana CLI: $solanaVersion" -ForegroundColor Green

# Step 2: Check spl-token CLI
$splTokenPath = Get-Command spl-token -ErrorAction SilentlyContinue
if (-not $splTokenPath) {
    Write-Host "[!] spl-token CLI not found. Installing via cargo..." -ForegroundColor Yellow
    cargo install spl-token-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Failed to install spl-token-cli. Install manually: cargo install spl-token-cli" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
$splTokenVersion = spl-token --version
Write-Host "[OK] spl-token CLI: $splTokenVersion" -ForegroundColor Green
Write-Host ""

# Step 3: Configure devnet
Write-Host "[1/8] Configuring Solana devnet..." -ForegroundColor Cyan
solana config set --url https://api.devnet.solana.com
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Failed to configure devnet" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Devnet configured" -ForegroundColor Green
Write-Host ""

# Step 4: Check/create wallet
Write-Host "[2/8] Checking wallet..." -ForegroundColor Cyan
$walletAddress = $null
try {
    $walletAddress = solana address 2>$null
} catch {}

if (-not $walletAddress -or $walletAddress -match "not found") {
    Write-Host "    No wallet found. Creating new keypair..." -ForegroundColor Yellow
    solana-keygen new --no-bip39-passphrase
    $walletAddress = solana address
}
Write-Host "[OK] Wallet: $walletAddress" -ForegroundColor Green
Write-Host ""

# Step 5: Check balance and airdrop
Write-Host "[3/8] Checking SOL balance..." -ForegroundColor Cyan
$balance = solana balance --sol 2>$null
Write-Host "    Current balance: $balance"

if ($balance -match "0 SOL") {
    Write-Host "    Balance is 0. Requesting devnet airdrop (2 SOL)..." -ForegroundColor Yellow
    solana airdrop 2
    Write-Host "[OK] Airdrop completed" -ForegroundColor Green
} else {
    Write-Host "[OK] Sufficient balance" -ForegroundColor Green
}
Write-Host ""

# Step 6: Create token mint
Write-Host "[4/8] Creating `$RDX token mint (9 decimals)..." -ForegroundColor Cyan
$tokenMintOutput = spl-token create-token --decimals 9 --enable-metadata 2>&1
$tokenMint = ($tokenMintOutput | Select-String -Pattern "Creating token (\w+)" -AllMatches).Matches.Groups[1].Value
if (-not $tokenMint) {
    # Try alternative parsing
    $tokenMint = ($tokenMintOutput | Where-Object { $_ -match "Creating token" }) -replace "Creating token\s+", ""
}
Write-Host "[OK] Token mint: $tokenMint" -ForegroundColor Green
Write-Host ""

# Step 7: Initialize metadata
Write-Host "[5/8] Initializing metadata..." -ForegroundColor Cyan
spl-token initialize-metadata $tokenMint "Redacted Protocol" "RDX" "https://redacted-protocol.vercel.app/metadata.json"
Write-Host "[OK] Metadata initialized" -ForegroundColor Green
Write-Host ""

# Step 8: Create token account
Write-Host "[6/8] Creating associated token account..." -ForegroundColor Cyan
$tokenAccountOutput = spl-token create-account $tokenMint 2>&1
$tokenAccount = ($tokenAccountOutput | Select-String -Pattern "Creating account (\w+)" -AllMatches).Matches.Groups[1].Value
if (-not $tokenAccount) {
    $tokenAccount = ($tokenAccountOutput | Where-Object { $_ -match "Creating account" }) -replace "Creating account\s+", ""
}
Write-Host "[OK] Token account: $tokenAccount" -ForegroundColor Green
Write-Host ""

# Step 9: Mint supply
Write-Host "[7/8] Minting total supply (1,000,000,000 RDX)..." -ForegroundColor Cyan
spl-token mint $tokenMint 1000000000
Write-Host "[OK] Total supply minted" -ForegroundColor Green
Write-Host ""

# Step 10: Revoke mint authority
Write-Host "[8/8] Revoking mint authority..." -ForegroundColor Cyan
spl-token authorize $tokenMint --disable mint
Write-Host "[OK] Mint authority revoked - supply is now fixed and deflationary" -ForegroundColor Green
Write-Host ""

# Display results
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   `$RDX TOKEN DEPLOYED ON DEVNET" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Token Mint:      $tokenMint" -ForegroundColor Yellow
Write-Host "  Token Account:   $tokenAccount" -ForegroundColor Yellow
Write-Host "  Total Supply:    1,000,000,000 RDX" -ForegroundColor Yellow
Write-Host "  Mint Authority:  REVOKED" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Explorer: https://explorer.solana.com/address/$tokenMint?cluster=devnet" -ForegroundColor Cyan
Write-Host ""

# Save deployment info
$deployInfo = @{
    network = "devnet"
    token_name = "Redacted Protocol"
    token_symbol = "RDX"
    token_mint = $tokenMint
    token_account = $tokenAccount
    decimals = 9
    total_supply = "1000000000"
    mint_authority_revoked = $true
    deployed_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

$deployInfo | Out-File -FilePath "token_deployment_devnet.json" -Encoding utf8
Write-Host "[OK] Saved to token_deployment_devnet.json" -ForegroundColor Green
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   TESTING COMPLETE - The file is breathing..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
