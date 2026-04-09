#!/usr/bin/env bash
# =============================================================================
# Redacted Protocol Agent — Production Deployment Script
# Usage: ./deploy.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

INSTALL_DIR="/opt/redacted-protocol"
USER_NAME="rd-agent"

log_info "========================================="
log_info "  Redacted Protocol — Production Deploy"
log_info "========================================="

# 1. Create user
if id "$USER_NAME" &>/dev/null; then
    log_info "User $USER_NAME already exists"
else
    log_info "Creating service user: $USER_NAME"
    useradd -r -m -s /bin/false "$USER_NAME"
fi

# 2. Install dependencies
log_info "Installing system dependencies..."
if command -v apt-get &>/dev/null; then
    apt-get update && apt-get install -y curl ca-certificates
elif command -v yum &>/dev/null; then
    yum install -y curl ca-certificates
fi

# 3. Create install directory
log_info "Setting up $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"/{data/sessions,logs}
chown -R "$USER_NAME:$USER_NAME" "$INSTALL_DIR"

# 4. Build or copy binary
if [ -f "target/release/rd" ]; then
    log_info "Using existing release binary"
    cp target/release/rd "$INSTALL_DIR/"
elif command -v cargo &>/dev/null; then
    log_info "Building release binary..."
    cargo build --release
    cp target/release/rd "$INSTALL_DIR/"
else
    log_error "No release binary found and cargo not installed"
    exit 1
fi
chown "$USER_NAME:$USER_NAME" "$INSTALL_DIR/rd"
chmod 755 "$INSTALL_DIR/rd"

# 5. Configure environment
if [ ! -f "$INSTALL_DIR/.env" ]; then
    log_info "Creating .env from template..."
    cp .env.example "$INSTALL_DIR/.env"
    log_warn "Please edit $INSTALL_DIR/.env and set your API keys"
    log_warn "Run: nano $INSTALL_DIR/.env"
fi
chown "$USER_NAME:$USER_NAME" "$INSTALL_DIR/.env"
chmod 600 "$INSTALL_DIR/.env"

# 6. Install systemd service
log_info "Installing systemd service..."
cp redacted-protocol.service /etc/systemd/system/
systemctl daemon-reload

# 7. Enable and start
log_info "Enabling and starting service..."
systemctl enable redacted-protocol
systemctl restart redacted-protocol

# 8. Status
sleep 2
if systemctl is-active --quiet redacted-protocol; then
    log_info "========================================="
    log_info "  ✅ Deployment successful!"
    log_info "========================================="
    echo ""
    log_info "Service status:"
    systemctl status redacted-protocol --no-pager -l
    echo ""
    log_info "View logs: journalctl -u redacted-protocol -f"
    log_info "Stop service: systemctl stop redacted-protocol"
    log_info "Edit config: nano $INSTALL_DIR/.env"
else
    log_error "Service failed to start"
    log_error "Check logs: journalctl -u redacted-protocol -n 50"
    exit 1
fi
