# 🚀 Redacted Protocol — Production Deployment Guide

> **Autonomous AI Agent for Document Declassification on Solana**
>
> 100% Rust · Zero-Knowledge · MIT Licensed · Production-Ready

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Deploy (3 Options)](#quick-deploy-3-options)
3. [Configuration](#configuration)
4. [Security Checklist](#security-checklist)
5. [Monitoring & Health](#monitoring--health)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 1 GB | 2 GB |
| **Disk** | 5 GB | 10 GB (SSD) |
| **OS** | Ubuntu 20.04+, Debian 11+, CentOS 8+ | Ubuntu 22.04 LTS |
| **Network** | Outbound HTTPS (443) | + Telegram API |
| **Rust** | 1.75+ | 1.83+ |

---

## Quick Deploy (3 Options)

### Option 1: Automated Script (Fastest)

```bash
# Clone repository
git clone https://github.com/whalesconspiracy-33/the-redacted-protocol.git
cd the_redacted_protocol

# Run deployment script
sudo ./deploy.sh

# Edit configuration
sudo nano /opt/redacted-protocol/.env

# Restart with your settings
sudo systemctl restart redacted-protocol
```

### Option 2: Docker Compose

```bash
# Clone and configure
git clone https://github.com/whalesconspiracy-33/the-redacted-protocol.git
cd the_redacted_protocol
cp .env.example .env
nano .env  # Set your API keys

# Build and start
docker compose up -d --build

# View logs
docker compose logs -f rd-agent
```

### Option 3: Manual Systemd

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. Clone and build
git clone https://github.com/whalesconspiracy-33/the-redacted-protocol.git
cd the_redacted_protocol
cargo build --release

# 3. Create service user
sudo useradd -r -m -s /bin/false rd-agent

# 4. Install binary
sudo mkdir -p /opt/redacted-protocol/{data/sessions,logs}
sudo cp target/release/rd /opt/redacted-protocol/
sudo cp .env.example /opt/redacted-protocol/.env
sudo chown -R rd-agent:rd-agent /opt/redacted-protocol

# 5. Configure environment
sudo nano /opt/redacted-protocol/.env

# 6. Install systemd service
sudo cp redacted-protocol.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable redacted-protocol
sudo systemctl start redacted-protocol

# 7. Verify
sudo systemctl status redacted-protocol
journalctl -u redacted-protocol -f
```

---

## Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key (free tier) | `sk-or-v1-...` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `123456789:ABC...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_MODEL` | LLM model | `google/gemini-2.0-flash-exp:free` |
| `TELEGRAM_CHAT_ID` | Default chat ID | - |
| `ANTHROPIC_API_KEY` | Anthropic Claude key | - |
| `OPENAI_API_KEY` | OpenAI GPT key | - |
| `XAI_API_KEY` | xAI Grok key | - |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_NETWORK` | Solana network | `devnet` |
| `HELIUS_RPC_URL` | Helius RPC (optional) | - |
| `ARWEAVE_WALLET_PATH` | Arweave wallet path | `./wallet.json` |
| `AGENT_CONFIDENCE_THRESHOLD` | Min confidence for fragments | `85` |
| `AGENT_MAX_RETRIES` | Max retry attempts | `3` |
| `AGENT_COOLDOWN_SECONDS` | Cooldown between jobs | `300` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `RUST_LOG` | Rust crate log levels | See `.env.example` |
| `DISCORD_WEBHOOK_URL` | Discord alerts (optional) | - |
| `SENTRY_DSN` | Sentry error tracking (optional) | - |

### Logging Configuration

Production logging uses structured output via `tracing`:

```env
# Console logging (default)
RUST_LOG=rd_core=info,rd_tools=info,rd_hooks=info,rd_providers=info

# Debug logging (troubleshooting)
RUST_LOG=debug

# JSON logging (production, parse by log aggregator)
LOG_FORMAT=json
```

---

## Security Checklist

- [x] **API keys never committed** — `.env` is in `.gitignore`
- [x] **SSRF protection** — News scanner blocks private/reserved IPs
- [x] **Hook timeouts** — All hooks have 30s default timeout
- [x] **Permission levels** — Tools restricted by role (Observer/Reconstructor/Declassifier)
- [ ] **Rotate API keys** — If previously exposed, regenerate immediately
- [ ] **Set restrictive file permissions** — `chmod 600 .env`
- [ ] **Use firewall** — Allow only necessary outbound (443, Telegram API)
- [ ] **Monitor logs** — Set up alerts for errors/anomalies
- [ ] **Backup sessions** — Regular backups of `/opt/redacted-protocol/data/`
- [ ] **Keep updated** — Pull latest version and rebuild monthly

---

## Monitoring & Health

### Systemd

```bash
# Service status
systemctl status redacted-protocol

# Live logs
journalctl -u redacted-protocol -f

# Last 100 lines
journalctl -u redacted-protocol -n 100

# Errors only
journalctl -u redacted-protocol -p err
```

### Docker

```bash
# Container status
docker compose ps

# Live logs
docker compose logs -f rd-agent

# Resource usage
docker stats redacted-protocol-agent
```

### Health Check

The agent exposes a health endpoint at `http://localhost:8080/health`:

```bash
curl http://localhost:8080/health
# Expected: {"status":"healthy","uptime":12345,"version":"0.1.0"}
```

### Metrics

Monitor these key indicators:

| Metric | Alert Threshold | Description |
|--------|----------------|-------------|
| **Memory** | > 1.5 GB | Memory leak detection |
| **CPU** | > 80% for 10 min | Runaway process |
| **Uptime** | < 1 hour | Frequent crashes |
| **Error rate** | > 5 per hour | API/provider issues |
| **Session size** | > 100 MB | Unbounded growth |

---

## Backup & Recovery

### Session Data

Sessions contain full conversation history and are stored as JSON:

```bash
# Backup sessions
tar czf sessions-backup-$(date +%Y%m%d).tar.gz \
    /opt/redacted-protocol/data/sessions/

# Restore session
cp /backup/sessions/rd-*.json /opt/redacted-protocol/data/sessions/
```

### Configuration

```bash
# Backup config
cp /opt/redacted-protocol/.env /backup/rd-env-$(date +%Y%m%d)
```

### Full Backup Script

```bash
#!/usr/bin/env bash
BACKUP_DIR="/backup/redacted-protocol/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Sessions
tar czf "$BACKUP_DIR/sessions.tar.gz" /opt/redacted-protocol/data/sessions/ 2>/dev/null || true

# Config (exclude secrets in production)
cp /opt/redacted-protocol/.env "$BACKUP_DIR/" 2>/dev/null || true

# Systemd service
cp /etc/systemd/system/redacted-protocol.service "$BACKUP_DIR/"

echo "Backup complete: $BACKUP_DIR"
```

---

## Troubleshooting

### Agent won't start

```bash
# Check configuration
cat /opt/redacted-protocol/.env

# Check logs
journalctl -u redacted-protocol -n 50

# Test Telegram bot
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
```

### LLM errors

```bash
# Verify API key works
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    https://openrouter.ai/api/v1/auth/key

# Check model availability
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    https://openrouter.ai/api/v1/models
```

### High memory usage

```bash
# Check session sizes
ls -lhS /opt/redacted-protocol/data/sessions/*.json | head

# Clean old sessions (keep last 10)
ls -t /opt/redacted-protocol/data/sessions/*.json | tail -n +11 | xargs rm
```

### Telegram bot not responding

```bash
# Verify bot token
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe

# Check for rate limiting
journalctl -u redacted-protocol | grep -i "rate\|limit\|429"

# Restart service
sudo systemctl restart redacted-protocol
```

---

## Production Architecture

```
Internet
  │
  ├─ Telegram API ────────────────┐
  │                               │
  │    ┌──────────────────────────▼───────────────┐
  │    │  Redacted Protocol Agent (rd)            │
  │    │                                          │
  │    │  ┌──────────────────────────────────┐   │
  │    │  │ Orchestrator (ReAct Loop)         │   │
  │    │  │   ├─ LLM Provider Router          │   │
  │    │  │   ├─ Tool Registry                │   │
  │    │  │   ├─ Pre/Post Hooks               │   │
  │    │  │   └─ Permission Checker           │   │
  │    │  └──────────────────────────────────┘   │
  │    │                                          │
  │    │  ┌─────────────────┐  ┌──────────────┐  │
  │    │  │ News Intelligence│  │ Session Store│  │
  │    │  │ (SSRF-protected)│  │ (Atomic JSON)│  │
  │    │  └─────────────────┘  └──────────────┘  │
  │    └──────────────────────────┬───────────────┘
  │                               │
  ├─ Solana RPC ──────────────────┤
  ├─ Arweave Gateway ─────────────┤
  └─ LLM Providers ───────────────┘
```

---

**"The truth cannot be redacted. The file is breathing."**
