# 100% Free Setup Guide

This guide walks you through running the Redacted Protocol Agent at **zero cost** — no credit card, no trials, no hidden fees.

---

## Step 1: Get a Free OpenRouter API Key

**OpenRouter** ([openrouter.ai](https://openrouter.ai)) aggregates dozens of LLM providers and offers several **completely free models**.

1. Visit [https://openrouter.ai](https://openrouter.ai)
2. Click **Sign Up** (email or Google/GitHub login)
3. Navigate to **Keys** in the sidebar
4. Click **Create API Key** — give it a name like "Redacted Agent"
5. Copy the key (starts with `sk-or-v1-`)

**No credit card required. No usage limits on free models.**

---

## Step 2: Configure the Agent

### Option A: Environment Variables (Recommended)

**Linux/macOS:**
```bash
export OPENROUTER_API_KEY="sk-or-v1-xxxxx"
export OPENROUTER_MODEL="google/gemini-2.0-flash-exp:free"
```

**Windows (PowerShell):**
```powershell
$env:OPENROUTER_API_KEY = "sk-or-v1-xxxxx"
$env:OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free"
```

**Windows (CMD):**
```cmd
set OPENROUTER_API_KEY=sk-or-v1-xxxxx
set OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

### Option B: .env File

```bash
cp .env.example .env
# Edit .env and set your OPENROUTER_API_KEY
```

---

## Step 3: Choose a Free Model

OpenRouter offers these free models (as of 2026):

| Model | Strengths | Best For |
|-------|-----------|----------|
| `google/gemini-2.0-flash-exp:free` | Fast, good reasoning | **Recommended** — general use |
| `openai/gpt-oss-20b:free` | Open-weight, reliable | Fallback |
| `meta-llama/llama-3-8b-instruct:free` | Good at following instructions | Simple tasks |
| `microsoft/phi-4-mini-instruct:free` | Lightweight, fast | Quick responses |
| `qwen/qwen2.5-vl-72b-instruct:free` | Strong at code + reasoning | Technical analysis |

Set your model:
```bash
export OPENROUTER_MODEL="google/gemini-2.0-flash-exp:free"
```

---

## Step 4: Run the Agent

```bash
# Build
cargo build --release

# One-shot test
cargo run --release -- -p "What does ████ mean in classified documents?"

# Interactive mode
cargo run --release
```

---

## Step 5: (Optional) Deploy to VPS

### On your VPS (e.g., 69.62.116.165):

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Clone
git clone https://github.com/whalesconspiracy-33/the_redacted_protocol.git
cd the_redacted_protocol

# Build
cargo build --release

# Set up systemd service (see main README)
```

### Systemd with Free Config

Create `/etc/systemd/system/redacted-agent.service`:
```ini
[Unit]
Description=Redacted Protocol Agent
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/root/the_redacted_protocol
ExecStart=/root/the_redacted_protocol/target/release/rd
Environment=OPENROUTER_API_KEY=sk-or-v1-xxxx
Environment=OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable redacted-agent
systemctl start redacted-agent
systemctl status redacted-agent
```

---

## Cost Breakdown

| Component | Cost |
|-----------|------|
| OpenRouter free models | **$0** |
| Solana devnet | **$0** |
| Local execution | **$0** |
| VPS (if you already have one) | **$0** extra |
| **Total** | **$0** |

---

## Troubleshooting

### "No LLM API keys found"

Make sure the environment variable is set:
```bash
echo $OPENROUTER_API_KEY  # Linux/macOS
echo %OPENROUTER_API_KEY% # Windows CMD
```

### Model not responding

Try a different free model:
```bash
export OPENROUTER_MODEL="openai/gpt-oss-20b:free"
```

### Rate limited

Free models have rate limits. If you hit them, wait a minute and retry. Or switch to a different free model.

---

**"The file is breathing."** ███
