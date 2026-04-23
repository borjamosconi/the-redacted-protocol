# ═══════════════════════════════════════════════════════════════
#  VERCEL + DOMINIO PERSONALIZADO — redacted.bond
# ═══════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────
# ARQUITECTURA
# ─────────────────────────────────────────────────────────────

# app.redacted.bond    → Vercel (Dashboard Next.js)
# api.redacted.bond    → VPS (Bot Telegram + API)
# status.redacted.bond → VPS (Uptime Kuma opcional)

# ─────────────────────────────────────────────────────────────
# DNS CONFIGURATION (Hostinger)
# ─────────────────────────────────────────────────────────────

# Dashboard (Vercel):
#   CNAME  app  → cname.vercel-dns.com

# API (VPS):
#   A  api  → 69.62.116.165

# Status (VPS):
#   A  status  → 69.62.116.165

# Main domain (Vercel):
#   A  @  → 76.76.21.21  (ya configurado por Vercel)
#   CNAME  www  → cname.vercel-dns.com

# ─────────────────────────────────────────────────────────────
# VERCEL DEPLOY
# ─────────────────────────────────────────────────────────────

# 1. Push to GitHub
cd the_redacted_protocol
git add .
git commit -m "Deploy to Vercel with custom domain"
git push

# 2. Vercel will auto-deploy
#    Go to: https://vercel.com/dashboard
#    Import repo
#    Set root directory: dashboard
#    Add domain: app.redacted.bond

# 3. Vercel will give you DNS records to add in Hostinger

# ─────────────────────────────────────────────────────────────
# VPS — SOLO BOT TELEGRAM
# ─────────────────────────────────────────────────────────────

# Upload just the bot binary and .env
scp target/release/rd.exe root@69.62.116.165:/root/the_redacted_protocol/rd
scp .env root@69.62.116.165:/root/the_redacted_protocol/.env
scp start-autonomous.sh root@69.62.116.165:/root/the_redacted_protocol/

# SSH to VPS
ssh root@69.62.116.165
cd /root/the_redacted_protocol
chmod +x rd start-autonomous.sh
./start-autonomous.sh
