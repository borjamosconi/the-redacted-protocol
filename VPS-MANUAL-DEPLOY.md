# VPS Manual Deploy — Steps When You Wake Up

**Why this exists**: The Hostinger panel's Vue.js inputs reject programmatic
keystrokes from the MCP automation tools, so I couldn't reset the root password
or drive the browser terminal autonomously. Below is a 10-minute manual flow
that finishes the VPS deploy.

**TL;DR if you'd rather skip the VPS entirely**: the local agent is fully
running with auto-restart on Windows logon (Startup folder). The dashboard
shows 14 fresh devnet mints. Judging works fine without the VPS as long as
your PC is on. The VPS is a redundancy layer.

---

## Path A — Reinstall OS (cleanest, ~15 min)

Use this if you don't mind wiping the VPS (nothing critical lives on it — the
real services run on Vercel + Upstash + Solana devnet).

1. Open https://hpanel.hostinger.com/vps/919878/operating-system
2. Click **Reinstalar** (bottom of page)
3. Check the consent box, click **Siguiente**
4. Set a strong password (write it down — save in `.credentials` as
   `VPS_PASS=...`)
5. Wait 5–10 min for reinstall to complete
6. **CRUCIAL** — immediately add your SSH key from
   `~/.ssh/sforza_vps_ed25519.pub` via Hostinger panel
   (overview → "Clave SSH" or in `/settings`)
7. From local terminal:
   ```bash
   ssh -i ~/.ssh/sforza_vps_ed25519 root@69.62.116.165
   # If timeout, give it another 2-3 min — sshd needs to fully start
   ```
8. Once in, run the all-in-one deploy script below (Path C).

## Path B — Browser Terminal (no reinstall, ~10 min)

If you don't want to reinstall, just use the browser terminal manually:

1. Open https://hpanel.hostinger.com/vps/919878/overview
2. Click the **Terminal** button (top right of overview card) — it opens
   a new tab with an xterm
3. Login: `root` / your password
4. Once logged in, paste the deploy script (Path C below) directly into the
   terminal. Copy → right-click in terminal → Paste, or Ctrl+Shift+V

## Path C — Deploy script (copy-paste once you have a shell)

```bash
# ── 1. Kill runaway from old deploy
systemctl stop redacted-bot redacted-dashboard 2>/dev/null
systemctl disable redacted-bot redacted-dashboard 2>/dev/null
pkill -9 -f 'rd --telegram' 2>/dev/null
pkill -9 -f node 2>/dev/null
sleep 2

# ── 2. Confirm CPU dropped
top -bn1 | head -10
free -h | head -2

# ── 3. Open firewall (in case UFW is restrictive)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# ── 4. Get the code
mkdir -p /root && cd /root
if [ -d the-redacted-protocol ]; then
    cd the-redacted-protocol && git fetch origin && git reset --hard origin/master
else
    git clone https://github.com/whalesconspiracy-33/the-redacted-protocol.git
    cd the-redacted-protocol
fi

# ── 5. Install Rust + build agent
if ! command -v cargo &>/dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi
source $HOME/.cargo/env
cargo build --release --bin rd
ls -lh target/release/rd

# ── 6. Write .env (REPLACE the values below with the same ones in your local
#       C:\Users\mosko\Documents\THE REDACTED PROTOCOL\the_redacted_protocol\.env)
cat > /root/the-redacted-protocol/.env << 'EOF'
AGENT_SECRET=PASTE_FROM_LOCAL_ENV
DASHBOARD_URL=https://redacted.bond
OPENROUTER_API_KEY=PASTE_FROM_LOCAL_ENV
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
TELEGRAM_BOT_TOKEN=PASTE_FROM_LOCAL_ENV
TELEGRAM_CHAT_ID=PASTE_FROM_LOCAL_ENV
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
HELIUS_RPC_URL=PASTE_FROM_LOCAL_ENV
AGENT_AUTO_LAUNCH_TOKENS=true
EOF
chmod 600 /root/the-redacted-protocol/.env

# ── 7. systemd service
cat > /etc/systemd/system/redacted-agent.service << 'EOF'
[Unit]
Description=Redacted Protocol Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/the-redacted-protocol
EnvironmentFile=/root/the-redacted-protocol/.env
ExecStart=/root/the-redacted-protocol/target/release/rd --telegram
Restart=always
RestartSec=10
StandardOutput=append:/var/log/redacted-agent.log
StandardError=append:/var/log/redacted-agent.log
MemoryMax=1.5G
CPUQuota=70%

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now redacted-agent
sleep 5
systemctl status redacted-agent --no-pager | head -20
tail -30 /var/log/redacted-agent.log
```

## After the VPS agent is running

Stop the local agent (no double-minting):
```powershell
taskkill /F /IM rd.exe
# Then remove the auto-start so the agent doesn't relaunch:
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\redacted-agent.bat"
```

Verify in dashboard:
```bash
curl -s https://redacted.bond/api/tokens?limit=1 | jq .tokens[0]
# Look at createdAt — should keep updating every 30 min as the VPS agent
# detects new RSS events
```
