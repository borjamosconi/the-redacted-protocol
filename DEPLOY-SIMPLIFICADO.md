# 🔴 REDACTED PROTOCOL — Deploy en Vercel + VPS

## Arquitectura

```
app.redacted.bond     → Vercel (Dashboard Next.js)
api.redacted.bond     → VPS 69.62.116.165 (Bot Telegram)
status.redacted.bond  → VPS 69.62.116.165 (Uptime Kuma)
redacted.bond         → Vercel (redirect to app)
```

---

## 📋 PASOS

### 1️⃣ DNS en Hostinger

Agrega estos registros:

| Type | Name | Value |
|------|------|-------|
| CNAME | app | cname.vercel-dns.com |
| A | api | 69.62.116.165 |
| A | status | 69.62.116.165 |

El dominio principal `redacted.bond` ya apunta a Vercel (76.76.21.21).

### 2️⃣ Deploy Dashboard a Vercel

```cmd
DEPLOY-VERCEL.bat
```

O manualmente:

```cmd
cd the_redacted_protocol\dashboard
vercel --prod
```

Luego en [vercel.com](https://vercel.com):
1. Importa el repo
2. Root directory: `dashboard`
3. Settings → Domains → Add: `app.redacted.bond`
4. Vercel te dará el CNAME → agrégalo en Hostinger

### 3️⃣ Deploy Bot a VPS

Solo necesitas subir el binario y ejecutarlo:

```bash
# Subir archivos
scp the_redacted_protocol/target/release/rd.exe root@69.62.116.165:/root/rd
scp the_redacted_protocol/.env root@69.62.116.165:/root/.env
scp the_redacted_protocol/start-autonomous.sh root@69.62.116.165:/root/

# Conectar y ejecutar
ssh root@69.62.116.165
chmod +x /root/rd /root/start-autonomous.sh
cd /root
./start-autonomous.sh
```

---

## ✅ URLs Finales

| Service | URL | Hosting |
|---------|-----|---------|
| Dashboard | https://app.redacted.bond | Vercel |
| Bot API | https://api.redacted.bond | VPS |
| Status | https://status.redacted.bond | VPS |
| Telegram | https://t.me/theredacted_bot | VPS |

---

**Simple. Vercel para el frontend, VPS solo para el bot 24/7.**
