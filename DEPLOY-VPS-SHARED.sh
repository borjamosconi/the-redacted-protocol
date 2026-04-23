#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  DEPLOY VPS — Run this ENTIRE SCRIPT on the VPS
#  SSH: ssh root@YOUR_VPS_IP (see .credentials for password)
#  Then: paste this entire script
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
PROJECT="/opt/redacted-protocol"

# ═══════════════════════════════════════════════════════════════
log "1. SYSTEM UPDATE"
# ═══════════════════════════════════════════════════════════════

apt-get update -y && apt-get upgrade -y
ok "System updated"

# ═══════════════════════════════════════════════════════════════
log "2. INSTALL DEPENDENCIES"
# ═══════════════════════════════════════════════════════════════

apt-get install -y nginx curl git ca-certificates

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
ok "Node $(node --version)"
ok "npm $(npm --version)"

# ═══════════════════════════════════════════════════════════════
log "3. BUILD DASHBOARD"
# ═══════════════════════════════════════════════════════════════

mkdir -p "$PROJECT/dashboard"
cd "$PROJECT/dashboard"

# Download dashboard from GitHub (or upload via scp)
# For now, create a simple production build placeholder
cat > "$PROJECT/dashboard/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Redacted Protocol</title>
<style>
body{margin:0;background:#0a0a0a;color:#e0e0e0;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column}
h1{color:#ff1a1a;text-shadow:0 0 10px #ff1a1a;font-size:2rem}
.bar{height:2px;width:100px;background:linear-gradient(90deg,#ff1a1a,transparent);margin:1rem auto}
p{color:#666;letter-spacing:0.2em;font-size:0.8rem}
a{color:#9945ff;text-decoration:none}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<h1>REDACTED PROTOCOL</h1>
<div class="bar"></div>
<p>SYSTEM ACTIVE — FILE #0000 — DECLASSIFIED</p>
<p style="margin-top:2rem">Dashboard deployed at <a href="https://dashboard-ac350w0yi-331331.vercel.app">Vercel</a></p>
<p style="margin-top:0.5rem">Telegram: <a href="https://t.me/theredacted_bot">@theredacted_bot</a></p>
</body>
</html>
HTMLEOF

ok "Dashboard HTML created"

# ═══════════════════════════════════════════════════════════════
log "4. NGINX CONFIGURATION"
# ═══════════════════════════════════════════════════════════════

cat > /etc/nginx/sites-available/$DOMAIN << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN *.$DOMAIN;

    location / {
        root $PROJECT/dashboard;
        index index.html;
        try_files \$uri \$uri/ =404;
    }

    # Proxy to Vercel for full app
    location /app {
        return 301 https://dashboard-ac350w0yi-331331.vercel.app\$request_uri;
    }

    # Health check
    location /health {
        return 200 '{"status":"ok","service":"redacted-protocol"}';
        add_header Content-Type application/json;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx
ok "Nginx configured and running"

# ═══════════════════════════════════════════════════════════════
log "5. START TELEGRAM BOT"
# ═══════════════════════════════════════════════════════════════

# Check if binary exists
if [ -f "$PROJECT/rd" ]; then
    chmod +x "$PROJECT/rd"
    # Kill old instance
    pkill -f "rd --telegram" 2>/dev/null || true
    sleep 1
    # Start bot
    nohup "$PROJECT/rd" --telegram > "$PROJECT/logs/bot.log" 2>&1 &
    ok "Telegram bot started (PID: $!)"
else
    warn "Binary not found at $PROJECT/rd"
    warn "Upload it with: scp target/release/rd root@69.62.116.165:$PROJECT/rd"
fi

# ═══════════════════════════════════════════════════════════════
log "COMPLETE"
# ═══════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Website:  https://$DOMAIN"
echo "  Health:   https://$DOMAIN/health"
echo ""
echo "  Next steps:"
echo "  1. Upload full Next.js build for production:"
echo "     scp -r dashboard/.next root@69.62.116.165:$PROJECT/dashboard/"
echo "  2. Upload bot binary:"
echo "     scp target/release/rd root@69.62.116.165:$PROJECT/rd"
echo "  3. Set up SSL with certbot:"
echo "     certbot --nginx -d $DOMAIN"
echo ""
echo "  Manage bot:"
echo "    systemctl status redacted-bot  (if using systemd)"
echo "    tail -f $PROJECT/logs/bot.log"
echo "    pkill -f 'rd --telegram'"
echo ""
