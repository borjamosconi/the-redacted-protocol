#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  setup-vps-professional.sh — Complete VPS Setup for redacted.bond
#  Run on VPS: ssh root@69.62.116.165 'bash -s' < setup-vps-professional.sh
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step()  { echo -e "\n${CYAN}═══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════${NC}"; }

DOMAIN="redacted.bond"
VPS_IP="69.62.116.165"

# ═══════════════════════════════════════════════════════════════
log_step "SYSTEM PREPARATION"
# ═══════════════════════════════════════════════════════════════

# Update system
log_info "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install dependencies
log_info "Installing dependencies..."
apt-get install -y \
    nginx \
    certbot \
    python3-certbot-nginx \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    supervisor \
    ufw \
    htop \
    net-tools \
    fail2ban \
    nodejs \
    npm

# Node.js 20.x
log_info "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

log_info "Node.js: $(node --version)"
log_info "npm: $(npm --version)"

# ═══════════════════════════════════════════════════════════════
log_step "FIREWALL CONFIGURATION"
# ═══════════════════════════════════════════════════════════════

log_info "Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
echo "y" | ufw enable

log_info "Firewall rules:"
ufw status

# ═══════════════════════════════════════════════════════════════
log_step "FAIL2BAN CONFIGURATION"
# ═══════════════════════════════════════════════════════════════

log_info "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/*error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# ═══════════════════════════════════════════════════════════════
log_step "SSL CERTIFICATES (Let's Encrypt)"
# ═══════════════════════════════════════════════════════════════

log_info "Obtaining SSL certificates..."

# Create certbot webroot
mkdir -p /var/www/certbot

# Get wildcard certificate
certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    -d "*.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    || log_warn "SSL certificate failed - will retry later"

# Setup auto-renewal
log_info "Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

# ═══════════════════════════════════════════════════════════════
log_step "NGINX CONFIGURATION"
# ═══════════════════════════════════════════════════════════════

log_info "Configuring nginx..."

# Backup default config
mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak 2>/dev/null || true

# Create nginx.conf
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=dashboard:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
    limit_req_zone $binary_remote_addr zone=status:10m rate=2r/s;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Include site configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Create site configuration
cat > /etc/nginx/sites-available/$DOMAIN << SITEEOF
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN *.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# app.redacted.bond — Dashboard
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Next.js dashboard
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    limit_req zone=dashboard burst=20 nodelay;
}

# api.redacted.bond — API Gateway + Telegram Webhook
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Telegram webhook
    location /webhook/telegram {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API endpoints
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Health check (public)
    location /health {
        return 200 '{"status":"ok","service":"redacted-protocol"}';
        add_header Content-Type application/json;
        access_log off;
    }

    limit_req zone=api burst=10 nodelay;
}

# status.redacted.bond — Uptime Monitoring
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name status.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    add_header X-Frame-Options DENY;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    limit_req zone=status burst=5 nodelay;
}

# docs.redacted.bond — Documentation
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docs.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    add_header X-Frame-Options DENY;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
SITEEOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t
systemctl enable nginx
systemctl restart nginx

log_info "Nginx configured and running"

# ═══════════════════════════════════════════════════════════════
log_step "PROJECT DEPLOYMENT"
# ═══════════════════════════════════════════════════════════════

# Create project directory
PROJECT_DIR="/opt/redacted-protocol"
mkdir -p "$PROJECT_DIR"/{dashboard,logs,data}

# ═══════════════════════════════════════════════════════════════
log_step "DASHBOARD SETUP"
# ═══════════════════════════════════════════════════════════════

log_info "Setting up Next.js dashboard..."

# If dashboard files exist, use them
if [ -d "/root/the_redacted_protocol/dashboard" ]; then
    cp -r /root/the_redacted_protocol/dashboard/* "$PROJECT_DIR/dashboard/"
fi

cd "$PROJECT_DIR/dashboard"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    npm install --production
fi

# Build dashboard
npm run build

# Create systemd service for dashboard
cat > /etc/systemd/system/redacted-dashboard.service << EOF
[Unit]
Description=Redacted Protocol Dashboard
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR/dashboard
ExecStart=$(which npm) run start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

# Security
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$PROJECT_DIR/dashboard/.rdx-data

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable redacted-dashboard
systemctl start redacted-dashboard

log_info "Dashboard service created"

# ═══════════════════════════════════════════════════════════════
log_step "TELEGRAM BOT SETUP"
# ═══════════════════════════════════════════════════════════════

log_info "Setting up Telegram bot..."

# Copy binary if exists
if [ -f "/root/the_redacted_protocol/rd" ]; then
    cp /root/the_redacted_protocol/rd "$PROJECT_DIR/rd"
    chmod +x "$PROJECT_DIR/rd"
fi

# Copy .env
if [ -f "/root/the_redacted_protocol/.env" ]; then
    cp /root/the_redacted_protocol/.env "$PROJECT_DIR/.env"
fi

# Create systemd service for bot
cat > /etc/systemd/system/redacted-bot.service << EOF
[Unit]
Description=Redacted Protocol Telegram Bot
After=network.target nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/rd --telegram
Restart=on-failure
RestartSec=10
Environment=RUST_LOG=info
StandardOutput=append:$PROJECT_DIR/logs/bot.log
StandardError=append:$PROJECT_DIR/logs/bot.log

[Install]
WantedBy=multi-user.target
EOF

# ═══════════════════════════════════════════════════════════════
log_step "UPTIME KUMA SETUP (status.redacted.bond)"
# ═══════════════════════════════════════════════════════════════

log_info "Setting up Uptime Kuma..."

# Install Uptime Kuma via docker or npm
if command -v docker &>/dev/null; then
    docker run -d \
        --restart=always \
        -p 3001:3001 \
        -v uptime-kuma:/app/data \
        --name uptime-kuma \
        louislam/uptime-kuma:1
else
    # Install via npm
    if ! command -v pm2 &>/dev/null; then
        npm install -g pm2
    fi

    cd /opt
    git clone https://github.com/louislam/uptime-kuma.git
    cd uptime-kuma
    npm run setup

    # Start with PM2
    pm2 start npm --name "uptime-kuma" -- start

    # Create systemd service
    cat > /etc/systemd/system/uptime-kuma.service << EOF
[Unit]
Description=Uptime Kuma Monitoring
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/uptime-kuma
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable uptime-kuma
    systemctl start uptime-kuma
fi

# ═══════════════════════════════════════════════════════════════
log_step "DNS CONFIGURATION INSTRUCTIONS"
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  DNS CONFIGURATION REQUIRED${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Add these DNS records in your domain panel:${NC}"
echo ""
echo -e "  Type  | Name              | Value"
echo -e "  ------|-------------------|------------------"
echo -e "  A     | @                 | $VPS_IP"
echo -e "  A     | app               | $VPS_IP"
echo -e "  A     | api               | $VPS_IP"
echo -e "  A     | status            | $VPS_IP"
echo -e "  A     | docs              | $VPS_IP"
echo -e "  A     | * (wildcard)      | $VPS_IP"
echo ""
echo -e "${YELLOW}Or use these commands via your DNS provider API:${NC}"
echo ""
echo -e "  # If using Cloudflare:"
echo -e "  cloudflare dns add redacted.bond A @ $VPS_IP"
echo -e "  cloudflare dns add redacted.bond A app $VPS_IP"
echo -e "  cloudflare dns add redacted.bond A api $VPS_IP"
echo -e "  cloudflare dns add redacted.bond A status $VPS_IP"
echo -e "  cloudflare dns add redacted.bond A docs $VPS_IP"
echo ""

# ═══════════════════════════════════════════════════════════════
log_step "TELEGRAM WEBHOOK SETUP"
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  TELEGRAM WEBHOOK SETUP${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}After DNS is configured and bot is running, execute:${NC}"
echo ""
echo -e "  BOT_TOKEN=\$(grep TELEGRAM_BOT_TOKEN $PROJECT_DIR/.env | cut -d= -f2)"
echo -e "  curl -X POST \"https://api.telegram.org/bot\$BOT_TOKEN/setWebhook\" \\"
echo -e "       -d \"url=https://api.$DOMAIN/webhook/telegram\""
echo ""

# ═══════════════════════════════════════════════════════════════
log_step "FINAL STATUS"
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  INSTALLATION COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Services:${NC}"
echo ""
echo -e "  Dashboard:    https://app.$DOMAIN"
echo -e "  API:          https://api.$DOMAIN"
echo -e "  Status:       https://status.$DOMAIN"
echo -e "  Docs:         https://docs.$DOMAIN"
echo ""
echo -e "${CYAN}Manage services:${NC}"
echo ""
echo -e "  systemctl status redacted-bot"
echo -e "  systemctl status redacted-dashboard"
echo -e "  systemctl status uptime-kuma"
echo "  systemctl status nginx"
echo ""
echo -e "${CYAN}View logs:${NC}"
echo ""
echo -e "  journalctl -u redacted-bot -f"
echo -e "  journalctl -u redacted-dashboard -f"
echo -e "  tail -f $PROJECT_DIR/logs/bot.log"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo ""
echo -e "  1. Configure DNS records (see above)"
echo -e "  2. Wait 5-10 minutes for DNS propagation"
echo -e "  3. Run: certbot certonly --standalone -d $DOMAIN -d *.$DOMAIN"
echo -e "  4. Run: systemctl restart nginx"
echo -e "  5. Start bot: systemctl start redacted-bot"
echo -e "  6. Set Telegram webhook (see above)"
echo ""
