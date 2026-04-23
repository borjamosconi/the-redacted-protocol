# 🔴 REDACTED PROTOCOL — DEPLOY COMPLETADO

## ✅ Dashboard Live

**URL:** https://redacted.bond  
**Status:** ✅ FUNCIONANDO

---

## ⏳ PENDIENTE - DNS en Hostinger

Necesitas agregar este registro CNAME en tu panel de Hostinger:

| Type | Name | Value |
|------|------|-------|
| CNAME | app | cname.vercel-dns.com |

Esto hará que `app.redacted.bond` apunte al mismo dashboard.

---

## 📊 URLs Actuales

| Service | URL | Status |
|---------|-----|--------|
| **Dashboard** | https://redacted.bond | ✅ LIVE |
| **Dashboard (alt)** | https://dashboard-6u2qe1xt0-4-groflow.vercel.app | ✅ LIVE |
| **Telegram Bot** | https://t.me/theredacted_bot | ✅ Active |
| **app.redacted.bond** | Pendiente de DNS | ⏳ CNAME necesario |

---

## 🖥️ VPS — Solo Bot Telegram

La VPS (`69.62.116.165`) la usamos SOLO para el bot:

```bash
# Subir bot
scp the_redacted_protocol/target/release/rd.exe root@69.62.116.165:/root/rd
scp the_redacted_protocol/.env root@69.62.116.165:/root/.env
scp the_redacted_protocol/start-autonomous.sh root@69.62.116.165:/root/

# Ejecutar
ssh root@69.62.116.165
chmod +x /root/rd /root/start-autonomous.sh
cd /root && ./start-autonomous.sh
```

---

**Dashboard profesional en Vercel con dominio personalizado. VPS solo para el bot.**
