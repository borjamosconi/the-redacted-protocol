# 🔴 REDACTED PROTOCOL — GUÍA DE CONFIGURACIÓN COMPLETA

**Fecha:** 10 de abril de 2026  
**Estado:** ✅ TODO PREPARADO - Ejecutar scripts

---

## 🚀 EJECUCIÓN RÁPIDA (1 clic)

### Opción A: Configurar TODO en VPS
```
Doble clic en: CONFIGURE-EVERYTHING.bat
```
- Compila agente ✅
- Configura SSH ✅  
- Despliega a VPS ✅
- Inicia bot ✅

### Opción B: Probar bot local primero
```
Doble clic en: RUN-BOT-LOCAL.bat
```
- Inicia bot en tu PC ✅
- Verifica que funciona ✅

---

## 📋 PASO A PASO MANUAL

### 1️⃣ CONFIGURAR SSH KEY (solo 1 vez)

```cmd
copy-ssh-key-to-vps.bat
```

Te pedirá la contraseña de VPS **UNA SOLA VEZ**:
```
YOUR_VPS_PASSWORD_HERE
```

**Verificar que funciona:**
```cmd
ssh root@YOUR_VPS_IP_HERE "echo OK"
```
Debe responder `OK` **sin pedir contraseña**.

---

### 2️⃣ PROBAR BOT LOCALMENTE

```cmd
RUN-BOT-LOCAL.bat
```

**O desde terminal:**
```cmd
cd the_redacted_protocol
cargo run --release -- --telegram
```

**Deberías ver:**
```
╔══════════════════════════════════════════════════╗
║   REDACTED PROTOCOL — Telegram Bot               ║
║   Waiting for messages... Ctrl+C to exit         ║
╚══════════════════════════════════════════════════╝

Connected as: @theredacted_bot
```

**Prueba:** Envía `/start` a @theredacted_bot en Telegram

---

### 3️⃣ DESPLEGAR EN VPS

```cmd
CONFIGURE-EVERYTHING.bat
```

Esto hace TODO automáticamente:
1. ✅ Compila agente
2. ✅ Copia SSH key
3. ✅ Sube binario + .env + contracts
4. ✅ Inicia bot en VPS

---

### 4️⃣ VERIFICAR BOT EN VPS

```cmd
ssh root@69.62.116.165 "tail -f /root/the_redacted_protocol/bot.log"
```

**Debes ver logs del bot funcionando.**

---

### 5️⃣ ANCHOR CONTRACTS (VPS)

```bash
# Conectar a VPS
ssh root@69.62.116.165

# Ejecutar setup
cd /root/the_redacted_protocol
bash setup-vps-anchor.sh

# Compilar contracts
cd contracts
anchor build

# Deployar a devnet
anchor deploy --provider.cluster devnet
```

**Nota:** Esto toma ~10 minutos en la VPS.

---

### 6️⃣ DOCKER (después de reboot)

**REINICIA WINDOWS PRIMERO:**
```cmd
shutdown /r /t 0
```

**Después del reboot:**
1. Abre Docker Desktop
2. Acepta términos
3. Espera a que inicie (icono verde)

**Verificar:**
```cmd
docker --version
docker-compose --version
```

**Deploy con Docker:**
```cmd
cd the_redacted_protocol
docker-compose up -d
```

---

## 🔧 COMANDOS DE MONITOREO

### Bot en VPS
```cmd
# Ver logs
ssh root@69.62.116.165 "tail -f /root/the_redacted_protocol/bot.log"

# Ver proceso
ssh root@69.62.116.165 "ps aux | grep rd"

# Reiniciar bot
ssh root@69.62.116.165 "cd /root/the_redacted_protocol && ./start-autonomous.sh"
```

### Dashboard Local
```cmd
cd dashboard
npm run dev
```
Abre: http://localhost:3000

### Dashboard Producción
Visita: https://redacted-protocol.vercel.app

---

## 📊 CHECKLIST FINAL

| Tarea | Estado | Cómo verificar |
|-------|--------|----------------|
| TELEGRAM_CHAT_ID | ✅ Listo | `.env` tiene `469454645` |
| Build Rust | ✅ Listo | `cargo build --release` OK |
| Tests | ✅ 47/47 | `cargo test` OK |
| SSH Key | ⏳ Pendiente | Ejecutar `copy-ssh-key-to-vps.bat` |
| Deploy VPS | ⏳ Pendiente | Ejecutar `CONFIGURE-EVERYTHING.bat` |
| Bot Telegram | ⏳ Pendiente | Enviar `/start` a @theredacted_bot |
| Docker | ⏳ Requiere reboot | `docker --version` |
| Anchor Contracts | ⏳ Pendiente | SSH a VPS + `anchor build` |

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "TELEGRAM_BOT_TOKEN not set"
- Verifica `.env` tiene el token correcto
- Reinicia el bot

### Error: SSH pide password siempre
- Ejecuta `copy-ssh-key-to-vps.bat` de nuevo
- O usa: `ssh-copy-id root@69.62.116.165`

### Bot no responde en Telegram
1. Verifica chat ID: `469454645`
2. Revisa logs: `tail -f bot.log`
3. Reinicia: `pkill -f "rd.*--telegram" && ./rd --telegram`

### Docker no funciona
- Reboot obligatorio
- WSL2 debe estar habilitado
- Virtualización activada en BIOS

---

**"The truth cannot be redacted. The file is breathing."**
