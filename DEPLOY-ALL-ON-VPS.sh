#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  DEPLOY ALL — Run this on the VPS
# ═══════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "\n${CYAN}═══ $1 ═══${NC}\n"; }
ok() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

DOMAIN="redacted.bond"
VPS_IP="69.62.116.165"
PROJECT="/opt/redacted-protocol"

# ═══════════════════════════════════════════════════════════════
log "SYSTEM SETUP"
# ═══════════════════════════════════════════════════════════════

apt-get update && apt-get upgrade -y
apt-get install -y nginx certbot python3-certbot-nginx curl git nodejs npm supervisor ufw fail2ban

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
ok "Node $(node --version)"

# ═══════════════════════════════════════════════════════════════
log "FIREWALL"
# ═══════════════════════════════════════════════════════════════

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
ok "Firewall configured"

# ═══════════════════════════════════════════════════════════════
log "NGINX"
# ═══════════════════════════════════════════════════════════════

cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name redacted.bond *.redacted.bond;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name app.redacted.bond;

    ssl_certificate /etc/letsencrypt/live/redacted.bond/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/redacted.bond/privkey.pem;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.redacted.bond;

    ssl_certificate /etc/letsencrypt/live/redacted.bond/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/redacted.bond/privkey.pem;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }
}

server {
    listen 443 ssl http2;
    server_name status.redacted.bond;

    ssl_certificate /etc/letsencrypt/live/redacted.bond/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/redacted.bond/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
ok "Nginx configured"

# ═══════════════════════════════════════════════════════════════
log "SSL CERTIFICATES"
# ═══════════════════════════════════════════════════════════════

mkdir -p /var/www/certbot
certbot certonly --standalone -d $DOMAIN -d *.$DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || warn "SSL failed, retry later"
ok "SSL certificates obtained"

# ═══════════════════════════════════════════════════════════════
log "PROJECT SETUP"
# ═══════════════════════════════════════════════════════════════

mkdir -p $PROJECT/{dashboard,logs,data}

# Dashboard
if [ -d "/root/the_redacted_protocol/dashboard" ]; then
    cp -r /root/the_redacted_protocol/dashboard/* $PROJECT/dashboard/
fi

cd $PROJECT/dashboard
npm install --production
npm run build
ok "Dashboard built"

# ═══════════════════════════════════════════════════════════════
log "SYSTEMD SERVICES"
# ═══════════════════════════════════════════════════════════════

# Dashboard service
cat > /etc/systemd/system/redacted-dashboard.service << EOF
[Unit]
Description=Redacted Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT/dashboard
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Bot service
cat > /etc/systemd/system/redacted-bot.service << EOF
[Unit]
Description=Redacted Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT
ExecStart=$PROJECT/rd --telegram
Restart=on-failure
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable redacted-dashboard redacted-bot
systemctl start redacted-dashboard

ok "Services created"

# ═══════════════════════════════════════════════════════════════
log "TELEGRAM WEBHOOK"
# ═══════════════════════════════════════════════════════════════

if [ -f "$PROJECT/.env" ]; then
    BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN $PROJECT/.env | cut -d= -f2 | tr -d '[:space:]')
    if [ -n "$BOT_TOKEN" ]; then
        curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
             -d "url=https://api.$DOMAIN/webhook/telegram"
        ok "Telegram webhook set"
    fi
fi

# ═══════════════════════════════════════════════════════════════
log "DONE"
# ═══════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  https://app.redacted.bond"
echo "  https://api.redacted.bond"
echo "  https://status.redacted.bond"
echo ""
echo "  systemctl status redacted-bot"
echo "  systemctl status redacted-dashboard"
echo ""
