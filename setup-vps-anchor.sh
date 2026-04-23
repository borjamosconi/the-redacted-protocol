#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Setup Anchor CLI en VPS remota
#  Ejecutar en la VPS: ssh root@69.62.116.165
#  Luego: bash setup-vps-anchor.sh
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "════════════════════════════════════════════════════════"
echo "   REDACTED PROTOCOL — VPS Anchor Setup"
echo "════════════════════════════════════════════════════════"
echo ""

# 1. Check if solana is installed
if command -v solana &>/dev/null; then
    log_info "Solana CLI already installed: $(solana --version)"
else
    log_info "Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.15/install)"
    export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"
    echo 'export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
    log_info "Solana CLI installed: $(solana --version)"
fi

# 2. Check if anchor is installed
if command -v anchor &>/dev/null; then
    log_info "Anchor CLI already installed: $(anchor --version)"
else
    log_info "Installing Anchor CLI via avm..."
    cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked 2>&1 || {
        log_warn "Installation with --locked failed, trying without..."
        cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli 2>&1
    }
    log_info "Anchor CLI installed: $(anchor --version)"
fi

# 3. Check if the project exists
if [ -d "/root/the_redacted_protocol/contracts" ]; then
    log_info "Project directory found at /root/the_redacted_protocol/contracts"
    cd /root/the_redacted_protocol/contracts
else
    log_warn "Project directory not found. You need to deploy the project first."
    log_info "Run from Windows: .\deploy-to-vps.sh"
    exit 1
fi

# 4. Check Anchor.toml
if [ -f "Anchor.toml" ]; then
    log_info "Anchor.toml found"
    log_info "Programs configured:"
    grep "rd-" Anchor.toml | head -10
else
    log_error "Anchor.toml not found in contracts directory"
    exit 1
fi

# 5. Summary
echo ""
log_info "════════════════════════════════════════════════════════"
log_info "  VPS Setup Complete!"
log_info "════════════════════════════════════════════════════════"
echo ""
log_info "Available commands:"
echo "  anchor build     — Build all contracts"
echo "  anchor deploy    — Deploy to localnet/devnet"
echo "  anchor test      — Run tests"
echo ""
log_info "Next steps:"
echo "  1. cd /root/the_redacted_protocol/contracts"
echo "  2. anchor build"
echo "  3. anchor deploy --provider.cluster devnet"
echo "  4. anchor test"
echo ""
