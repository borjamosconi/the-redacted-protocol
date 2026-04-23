# 🔴 REDACTED PROTOCOL — Professional Deployment Guide

**Domain:** `redacted.bond`  
**Version:** 1.0.0  
**Date:** April 10, 2026

---

## 🌐 Architecture

```
                    redacted.bond (69.62.116.165)
                              │
                    ┌─────────┴─────────┐
                    │    Nginx Proxy    │
                    │   SSL (Let's Enc.)│
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────┴───────┐   ┌────────┴────────┐   ┌────────┴────────┐
│  app.         │   │  api.           │   │  status.        │
│  redacted.bond│   │  redacted.bond  │   │  redacted.bond  │
│               │   │                 │   │                 │
│  Next.js      │   │  Rust Agent     │   │  Uptime Kuma    │
│  Dashboard    │   │  Port 8080      │   │  Port 3001      │
│  Port 3000    │   │  + TG Webhook   │   │  Monitoring     │
└───────────────┘   └─────────────────┘   └─────────────────┘
```

### Subdomains

| Subdomain | Service | Port | Purpose |
|-----------|---------|------|---------|
| `app.redacted.bond` | Next.js Dashboard | 3000 | Main user interface |
| `api.redacted.bond` | Rust Agent API | 8080 | Telegram webhook + API |
| `status.redacted.bond` | Uptime Kuma | 3001 | Service monitoring |
| `docs.redacted.bond` | Documentation | 3002 | Project documentation |

---

## 📋 Prerequisites

1. **Domain:** `redacted.bond` registered
2. **VPS:** `69.62.116.165` (Ubuntu/Debian)
3. **SSH Access:** `root@69.62.116.165`

---

## 🚀 Quick Deploy

### 1. Configure DNS Records

Add these records in your DNS provider (dns-parking.com):

```
Type  | Name    | Value
------|---------|------------------
A     | @       | 69.62.116.165
A     | app     | 69.62.116.165
A     | api     | 69.62.116.165
A     | status  | 69.62.116.165
A     | docs    | 69.62.116.165
A     | *       | 69.62.116.165
```

### 2. Upload Project to VPS

```bash
# From Windows (Git Bash):
scp -r the_redacted_protocol/ root@69.62.116.165:/root/
scp setup-vps-professional.sh root@69.62.116.165:/root/
```

### 3. Run Setup Script

```bash
ssh root@69.62.116.165
cd /root
chmod +x setup-vps-professional.sh
bash setup-vps-professional.sh
```

### 4. Wait for DNS Propagation (5-10 min)

### 5. Verify

```bash
# Check all subdomains
curl -I https://app.redacted.bond
curl -I https://api.redacted.bond/health
curl -I https://status.redacted.bond
```

### 6. Set Telegram Webhook

```bash
BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN_HERE"
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
     -d "url=https://api.redacted.bond/webhook/telegram"
```

---

## 🔧 Manual Setup (Alternative)

### Nginx Configuration

```bash
# Copy nginx config
scp nginx/redacted.bond.conf root@69.62.116.165:/etc/nginx/sites-available/

# Enable site
ssh root@69.62.116.165
ln -s /etc/nginx/sites-available/redacted.bond.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### SSL Certificates

```bash
certbot certonly \
    --standalone \
    -d redacted.bond \
    -d "*.redacted.bond" \
    --agree-tos \
    --register-unsafely-without-email

# Auto-renewal
(crontab -l; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
```

---

## 📊 Service Management

### Check Status

```bash
systemctl status redacted-bot
systemctl status redacted-dashboard
systemctl status nginx
```

### View Logs

```bash
# Bot logs
journalctl -u redacted-bot -f

# Dashboard logs
journalctl -u redacted-dashboard -f

# Nginx access logs
tail -f /var/log/nginx/access.log
```

### Restart Services

```bash
systemctl restart redacted-bot
systemctl restart redacted-dashboard
systemctl restart nginx
```

---

## 🔒 Security

### Firewall (UFW)

```
Status: Active
Rules:
  - 22/tcp (SSH)
  - 80/tcp (HTTP)
  - 443/tcp (HTTPS)
```

### Fail2Ban

- SSH: 3 failed attempts → 24h ban
- Nginx: 5 failed auth → 1h ban

### SSL/TLS

- Provider: Let's Encrypt
- Auto-renewal: Every day at 3:00 AM
- Minimum TLS version: 1.2

### Security Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📁 File Structure

```
/opt/redacted-protocol/
├── rd                          # Rust binary
├── .env                        # Environment variables
├── dashboard/                  # Next.js build
│   ├── .next/
│   ├── node_modules/
│   └── .rdx-data/             # Local database
└── logs/
    ├── bot.log                 # Telegram bot logs
    └── dashboard.log           # Dashboard logs

/etc/nginx/sites-available/
└── redacted.bond               # Nginx configuration

/etc/systemd/system/
├── redacted-bot.service        # Bot service
└── redacted-dashboard.service  # Dashboard service
```

---

## 🌍 URLs

| Service | URL | Status |
|---------|-----|--------|
| **Dashboard** | https://app.redacted.bond | ⏳ Pending |
| **API** | https://api.redacted.bond | ⏳ Pending |
| **Status** | https://status.redacted.bond | ⏳ Pending |
| **Health** | https://api.redacted.bond/health | ⏳ Pending |
| **Telegram Bot** | https://t.me/theredacted_bot | ✅ Active |

---

## 🆘 Troubleshooting

### DNS Not Resolving

```bash
# Check DNS propagation
nslookup app.redacted.bond
dig redacted.bond

# Check if pointing to VPS
curl https://api.ipify.org  # Should return 69.62.116.165
```

### SSL Certificate Issues

```bash
# Re-issue certificates
systemctl stop nginx
certbot certonly --standalone -d redacted.bond -d "*.redacted.bond" --force-renewal
systemctl start nginx
```

### Bot Not Responding

```bash
# Check if running
systemctl status redacted-bot

# Check logs
journalctl -u redacted-bot -n 50

# Restart
systemctl restart redacted-bot

# Verify webhook (replace with your actual bot token)
curl -s "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN_HERE/getWebhookInfo"
```

### Dashboard Not Loading

```bash
# Check service
systemctl status redacted-dashboard

# Check port
curl http://127.0.0.1:3000

# Rebuild
cd /opt/redacted-protocol/dashboard
npm run build
systemctl restart redacted-dashboard
```

---

**"The truth cannot be redacted. The file is breathing."**
