# ═══════════════════════════════════════════════════════════════
#  PROFESSIONAL DEPLOYMENT — redacted.bond
# ═══════════════════════════════════════════════════════════════

# Domain Architecture
DOMAIN: redacted.bond

# Subdomains:
#   app.redacted.bond      → Dashboard (Next.js)
#   api.redacted.bond      → API Gateway + Telegram Webhook
#   status.redacted.bond   → Uptime Kuma (monitoring)
#   docs.redacted.bond     → Documentation
#   monitor.redacted.bond  → System monitoring

# DNS Configuration (Point to VPS: 69.62.116.165)
# A records:
#   redacted.bond          → 69.62.116.165
#   *.redacted.bond        → 69.62.116.165  (wildcard)

# Services:
#   Nginx (ports 80, 443)  → Reverse proxy + SSL
#   Node.js (port 3000)    → Dashboard
#   Rust (port 8080)       → API + Telegram webhook
#   Uptime Kuma (port 3001) → Status page

# SSL: Let's Encrypt (certbot) — auto-renewal
