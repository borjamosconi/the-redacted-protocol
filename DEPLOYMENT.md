# Redacted Protocol Agent - Deployment Guide

## Quick Deployment

### Option 1: Local Deployment (Fastest)

```bash
# 1. Clone the repository
git clone https://github.com/AKIRA-33/the_redacted_protocol.git
cd the_redacted_protocol

# 2. Configure environment
cp .env.example .env
# Edit .env and set your API keys

# 3. Build and run
cargo build --release
cargo run --release -- --telegram
```

### Option 2: VPS Deployment (Recommended)

```bash
# 1. SSH into your VPS
ssh root@your-vps-ip

# 2. Install dependencies
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 3. Clone and build
git clone https://github.com/AKIRA-33/the_redacted_protocol.git
cd the_redacted_protocol
cargo build --release

# 4. Configure environment
cp .env.example .env
# Edit .env and set your API keys

# 5. Create systemd service
sudo nano /etc/systemd/system/redacted-agent.service
```

**Systemd Service File:**

```ini
[Unit]
Description=Redacted Protocol Agent
After=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/the_redacted_protocol
ExecStart=/root/the_redacted_protocol/target/release/rd --telegram
Environment=OPENROUTER_API_KEY=your_key
Environment=TELEGRAM_BOT_TOKEN=your_bot_token
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable redacted-agent
sudo systemctl start redacted-agent
sudo systemctl status redacted-agent
```

### Option 3: Docker Deployment

```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
WORKDIR /app
COPY --from=builder /app/target/release/rd .
COPY .env .env
CMD ["./rd", "--telegram"]
```

**Build and run:**

```bash
docker build -t redacted-agent .
docker run -d --name redacted-agent --env-file .env redacted-agent
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key (free) | `sk-or-v1-xxxx` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `123456789:ABC...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_MODEL` | LLM model to use | `google/gemini-2.0-flash-exp:free` |
| `TELEGRAM_CHAT_ID` | Default chat ID | - |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `AGENT_CONFIDENCE_THRESHOLD` | Min confidence for fragments | `85` |
| `AGENT_MAX_RETRIES` | Max retry attempts | `3` |

## Monitoring

### View Logs

```bash
# Systemd
journalctl -u redacted-agent -f

# Docker
docker logs -f redacted-agent

# Direct
tail -f /root/the_redacted_protocol/logs/agent.log
```

### Health Check

```bash
# Check if agent is running
systemctl status redacted-agent

# Check Telegram bot
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
```

## Troubleshooting

### Agent not starting

1. Check environment variables: `cat .env`
2. Check logs: `journalctl -u redacted-agent -n 50`
3. Test Telegram bot: `curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe`

### Telegram bot not responding

1. Verify bot token is correct
2. Check if bot is running: `/start` command
3. Check logs for errors

### LLM errors

1. Verify OpenRouter API key
2. Check model availability
3. Try different model: `OPENROUTER_MODEL=anthropic/claude-sonnet-4`

## Next Hackathon Preparation

### Repository Checklist

- [x] Complete Rust agent (8 crates)
- [x] Solana Anchor programs
- [x] Telegram bot integration
- [x] Dashboard (Next.js)
- [x] Documentation
- [x] MIT License
- [x] Public GitHub repository

### Registration Checklist

- [ ] Create agent account at Colosseum
- [ ] Set up AgentWallet for Solana operations
- [ ] Register project with all required fields
- [ ] Get human claim for prize eligibility
- [ ] Post on forum for visibility
- [ ] Vote on other projects

### Required Fields for Project Registration

| Field | Max Length | Description |
|-------|------------|-------------|
| `name` | - | Project name |
| `description` | - | 1-2 sentence summary |
| `repoLink` | - | Public GitHub URL |
| `solanaIntegration` | 1000 chars | How project uses Solana |
| `problemStatement` | 1200 chars | Problem being solved |
| `technicalApproach` | 1200 chars | How it works under the hood |
| `targetAudience` | 1000 chars | Who is the first user |
| `businessModel` | 1000 chars | Revenue model |
| `competitiveLandscape` | 1000 chars | What exists today |
| `futureVision` | 1000 chars | Where this goes after hackathon |
| `tags` | 1-3 tags | Choose from allowed list |

### Allowed Tags

`defi`, `stablecoins`, `rwas`, `infra`, `privacy`, `consumer`, `payments`, `trading`, `depin`, `governance`, `new-markets`, `ai`, `security`, `identity`

---

**"The truth cannot be redacted. The file is breathing."**
