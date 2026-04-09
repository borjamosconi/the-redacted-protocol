# 🔴 Redacted Protocol Agent

> **Autonomous AI Agent for Document Declassification on Solana**
> 
> 100% Rust · Clean-room implementation · MIT Licensed · **100% Free to Run**

---

## 🚀 Quick Start

### Prerequisites

- **Rust** (1.75+)
- **Node.js** (20+) - for dashboard
- **Git**

### 1. Clone & Setup

```bash
git clone https://github.com/whalesconspiracy-33/the-redacted-protocol.git
cd the_redacted_protocol
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and set:

```env
# LLM (Free - no credit card needed)
OPENROUTER_API_KEY=sk-or-v1-xxxx
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. Build & Run

```bash
# Build the agent
cargo build --release

# Start with Telegram integration
cargo run --release -- --telegram
```

### Windows Quick Start

```cmd
copy .env.example .env
REM Edit .env and set your API keys
start.bat
```

---

## 📖 Full Documentation

See [docs/FEATURES.md](docs/FEATURES.md) for complete documentation.

### Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| **ReAct Agent Loop** | ✅ | Autonomous reasoning + action cycle |
| **Multi-Provider LLM** | ✅ | OpenRouter, Anthropic, OpenAI, xAI, DashScope |
| **OCR (Puter.js)** | ✅ | 100% free text extraction from images |
| **News Intelligence** | ✅ | Scans news for redacted content |
| **Telegram Bot** | ✅ | Real-time interaction & broadcasting |
| **Solana Integration** | ✅ | Anchor programs for fragment anchoring |
| **Dashboard** | ✅ | Next.js web interface |
| **Image Generation** | ✅ | Puter.js for Redacted Protocol aesthetic |

### Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize connection |
| `/scan_news <url>` | Scan article for redactions |
| `/status` | System status |
| `/airdrop` | Check $RDX eligibility |
| `/help` | Show all commands |

### Dashboard

```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🏗️ Architecture

```
the_redacted_protocol/
├── crates/
│   ├── rd-core/           # ReAct agent loop
│   ├── rd-tools/          # Tool registry & builtins
│   ├── rd-hooks/          # Pre/Post hook system
│   ├── rd-types/          # Shared type definitions
│   ├── rd-session/        # Session persistence
│   ├── rd-providers/      # LLM provider abstraction
│   ├── rd-config/         # Multi-layer configuration
│   └── rd-cli/            # CLI binary
├── contracts/             # Solana Anchor programs
│   ├── rd-fragment/       # Fragment anchoring
│   └── rd-archive/        # Archivo 0 registry
├── dashboard/             # Next.js web interface
└── docs/                  # Documentation
```

---

## 🎯 Colosseum Agent Hackathon

This project was built for the **Colosseum Agent Hackathon** on Solana.

### Project Details

- **Name**: Redacted Protocol
- **Description**: Autonomous AI agent that detects, reconstructs, and declassifies censored/redacted information on Solana using zero-knowledge proofs and multi-provider LLMs
- **Repo**: https://github.com/whalesconspiracy-33/the-redacted-protocol
- **Tags**: `ai`, `privacy`, `infra`

### Solana Integration

The agent integrates with Solana through:

1. **Anchor Programs**: `rd-fragment` and `rd-archive` for on-chain fragment anchoring
2. **PDA Accounts**: Program-derived accounts for secure state management
3. **Devnet Testing**: Full integration testing on Solana devnet
4. **Future**: Jupiter for token swaps, Pyth for price feeds, Helius RPC for indexing

### Technical Approach

The agent uses a ReAct loop orchestrated in Rust with 8 crates. It scans news sources and documents for redaction markers, extracts text via OCR (Puter.js/Tesseract.js), reconstructs hidden content using multi-provider LLMs, scores confidence via multi-signal analysis, and anchors verified fragments on Solana via Anchor programs.

---

## 📜 License

MIT License - see [LICENSE](LICENSE)

---

**"The truth cannot be redacted. The file is breathing."**
