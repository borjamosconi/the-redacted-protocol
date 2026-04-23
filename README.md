# 🔴 THE REDACTED PROTOCOL

> **Autonomous AI Agent for Document Declassification & Censorship Detection on Solana**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)](https://www.rust-lang.org/)
[![Solana](https://img.shields.io/badge/solana-devnet-9945FF.svg)](https://solana.com/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4.svg)](https://t.me/theredacted_bot)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Telegram Bot](#-telegram-bot)
- [Dashboard](#-dashboard)
- [Smart Contracts](#-smart-contracts)
- [Security](#-security)
- [Deployment](#-deployment)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

The Redacted Protocol is an autonomous AI agent that:

- 🔍 **Scans news articles** for censorship and redaction
- 🧠 **Reconstructs redacted text** using multi-LLM analysis
- 📸 **Generates dystopian images** via AI (Pollinations/Muapi)
- 💬 **Operates via Telegram bot** with natural language interface
- ⛓️ **Records on Solana blockchain** for immutable proof
- 📊 **Provides airdrop tracking** for early adopters

Built for the **Colosseum Agent Hackathon** on Solana.

### 🧠 The Evolution: From ElizaOS to Redacted
The Redacted Protocol was born from the concepts pioneered by **Eliza (formerly ElizaOS)** and **OpenClaw**. While those frameworks opened the door for decentralized AI, Redacted Protocol takes it further with a **custom Rust-based ReAct engine** and **Ralph Mode** for high-reliability autonomous operations.

---

## ✨ Features

### AI-Powered Analysis
- **Multi-LLM Router**: Falls back between OpenRouter, Anthropic, OpenAI, and xAI
- **Redaction Detection**: Identifies black bars, [REDACTED], and censorship patterns
- **Text Reconstruction**: Cross-model agreement for accurate reconstruction
- **Autonomous News Scanning**: Polls sources every 30 minutes automatically

### Image Generation
- **Pollinations.ai**: Free, no API key needed for gallery images
- **Muapi.ai**: 200+ models (Flux, Midjourney, Kling, Veo, etc.)
- **6 Redacted Styles**: CensoredFigure, AccessDenied, FloatingDocuments, CircuitBoard, ClassifiedDoc, GlitchInterference
- **Video & Cinema**: AI video generation with camera controls

### Telegram Integration
- **Natural Language**: Paste any URL and the bot scans it automatically
- **Inline Keyboards**: Quick actions with buttons
- **Scheduled Posts**: Auto-broadcast at :00 and :33
- **Airdrop Tracking**: Register and check $RDX eligibility
- **Commands**: `/start`, `/status`, `/airdrop`, `/scan_news`, `/gen_image`, `/gen_video`, `/gen_cinema`

### Dashboard
- **Next.js 15 + React 19**: Modern, responsive UI
- **Gallery Section**: 15 pre-built prompts with Pollinations images
- **OCR Section**: Upload documents for redaction analysis
- **Airdrop Site**: Register wallet for $RDX tokens

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    THE REDACTED PROTOCOL                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │  CLI / Bot   │    │  Dashboard   │    │  Airdrop   │ │
│  │   (Rust)     │    │  (Next.js)   │    │   Site     │ │
│  └──────┬───────┘    └──────┬───────┘    └─────┬──────┘ │
│         │                   │                   │        │
│         └───────────────────┼───────────────────┘        │
│                             │                            │
│  ┌──────────────────────────┴─────────────────────────┐  │
│  │              Core Agent Engine                      │  │
│  │                                                     │  │
│  │  rd-core:    ReAct agent loop                      │  │
│  │  rd-tools:   Telegram, airdrop, scanners           │  │
│  │  rd-types:   Shared types & schemas                │  │
│  │  rd-providers: Multi-LLM router                    │  │
│  │  rd-session: Session persistence                   │  │
│  │  rd-config:  Multi-layer configuration             │  │
│  │  rd-hooks:   Pre/post hook system                  │  │
│  │  rd-muapi:   Muapi.ai API client                   │  │
│  │  Ralph Mode: Autonomous Self-Correction            │  │
│  └─────────────────────────────────────────────────────┘  │
│                             │                            │
│         ┌───────────────────┼───────────────────┐        │
│         ▼                   ▼                   ▼        │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   OpenRouter │    │   Muapi.ai   │    │  Solana    │ │
│  │   (LLMs)     │    │  (Images)    │    │ (Blockchain)│ │
│  └──────────────┘    └──────────────┘    └────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Rust Crates

| Crate | Purpose |
|-------|---------|
| `rd-core` | ReAct agent loop (reasoning + action cycle) |
| `rd-tools` | Tool registry including Telegram bot |
| `rd-types` | Shared type definitions (image generation, OCR, permissions) |
| `rd-providers` | Multi-LLM provider abstraction |
| `rd-session` | Session persistence |
| `rd-config` | Multi-layer configuration |
| `rd-cli` | CLI binary (supports `--telegram` flag) |
| `rd-hooks` | Pre/post hook system |
| `rd-muapi` | Muapi.ai API client for image/video generation |
| `rd-arweave` | Arweave storage client |

📖 **Detailed Agent Documentation**: [AGENT_GUIDE.md](docs/AGENT_GUIDE.md)

### Smart Contracts (Solana Anchor)

| Program | Purpose |
|---------|---------|
| `rd-token` | $RDX token contract |
| `rd-presale` | Presale management |
| `rd-fragment` | Document fragment storage |
| `rd-archive` | Permanent document archival |

---

## 🚀 Quick Start

### Prerequisites

- **Rust** 1.75+ (`rustup install stable`)
- **Node.js** 20+ (for dashboard)
- **Solana CLI** (optional, for contract deployment)
- **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather))

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/the-redacted-protocol.git
cd the-redacted-protocol
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your API keys
nano .env
```

**Required environment variables:**
```bash
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE
OPENROUTER_MODEL=google/gemini-2.5-flash:free
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_CHAT_ID_HERE
MUAPI_API_KEY=YOUR_MUAPI_KEY_HERE  # Optional (for image generation)
```

### 3. Run CLI Agent

```bash
# Build release
cargo build --release

# Run in interactive mode
cargo run --release

# Run Telegram bot mode
cargo run --release -- --telegram
```

### 4. Run Dashboard

```bash
cd dashboard
npm install
npm run dev
# Open: http://localhost:3001
```

---

## 📦 Installation

### Full Installation (All Components)

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Install Node.js (use nvm or download from nodejs.org)

# 3. Clone repository
git clone https://github.com/YOUR_USERNAME/the-redacted-protocol.git
cd the-redacted-protocol

# 4. Build Rust components
cargo build --release

# 5. Install dashboard dependencies
cd dashboard
npm install
cd ..

# 6. Install airdrop site dependencies
cd airdrop-site
npm install
cd ..
```

### Docker Installation

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## ⚙️ Configuration

### Environment Variables

See `.env.example` for a complete list of configuration options.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | ✅ | - | Primary LLM API key |
| `OPENROUTER_MODEL` | ✅ | `google/gemini-2.5-flash:free` | Model to use |
| `TELEGRAM_BOT_TOKEN` | For bot mode | - | Telegram bot token |
| `MUAPI_API_KEY` | Optional | - | Image/video generation |
| `SOLANA_RPC_URL` | For blockchain | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `AGENT_CONFIDENCE_THRESHOLD` | Optional | `85` | Minimum confidence % |

### Configuration Files

- `.env` - All API keys and settings
- `.credentials` - VPS passwords (for deployment scripts only)
- `wallet.json` - Arweave wallet (for document archival)

---

## 💬 Telegram Bot

### Setup

1. **Create a bot**: Message [@BotFather](https://t.me/BotFather) with `/newbot`
2. **Get your token**: BotFather will give you a token like `123456:ABC-DEF...`
3. **Add to .env**: `TELEGRAM_BOT_TOKEN=your_token_here`
4. **Start the bot**: `cargo run --release -- --telegram`

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize connection |
| `/status` | System status |
| `/airdrop` | Check $RDX eligibility |
| `/scan_news <url>` | Scan article for censorship |
| `/gen_image <desc>` | Generate AI image |
| `/gen_video <desc>` | Generate AI video |
| `/gen_cinema <desc>` | Cinema shot with camera controls |
| `/help` | Show all commands |

### Features

- **Auto-detect URLs**: Paste any news URL and it scans automatically
- **Inline keyboards**: Quick action buttons
- **Scheduled posts**: Auto-broadcast at :00 and :33
- **Image generation**: Uses Muapi.ai with Pollinations fallback (free!)
- **Airdrop tracking**: Register and check eligibility

---

## 📊 Dashboard

### Run Locally

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

### Features

- **Gallery**: 15 AI-generated images with Pollinations.ai
- **OCR Analysis**: Upload documents to detect redaction
- **Airdrop Registration**: Check $RDX eligibility
- **Responsive Design**: Works on mobile and desktop

### Build for Production

```bash
npm run build
npm start
```

---

## ⛓️ Smart Contracts

### Deploy to Solana Devnet

```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install latest
avm use latest

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Configure to devnet
solana config set --url https://api.devnet.solana.com

# Build contracts
cd contracts
anchor build

# Deploy
anchor deploy
```

### Contracts

- **rd-token**: $RDX token with 1B supply
- **rd-presale**: Presale with price tiers
- **rd-fragment**: Store document fragments on-chain
- **rd-archive**: Permanent document archival

---

## 🔒 Security

**IMPORTANT**: This repository contains configuration files with sensitive data.

### Before Deploying

1. **NEVER commit `.env` files** - They contain your API keys
2. **NEVER commit `wallet.json`** - Contains private keys
3. **Rotate exposed keys immediately** - If any key was public, revoke it
4. **Use SSH keys for VPS** - Not passwords
5. **Setup firewall** - Only open necessary ports

### Security Checklist

- [ ] All API keys are unique and not in repository
- [ ] `.env` and `.credentials` are in `.gitignore`
- [ ] Wallet files are backed up separately
- [ ] VPS uses SSH key authentication
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] Dependencies updated regularly

📖 **Read the full [SECURITY.md](SECURITY.md) for detailed guidelines.**

---

## 🚀 Deployment

### Deploy to VPS

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide.

Quick deployment:

```bash
# Run deployment script
./deploy-to-vps.sh

# Or use Docker
docker-compose up -d
```

### Deploy Dashboard to Vercel

```bash
cd dashboard
vercel --prod
```

---

## 👨‍💻 Development

### Project Structure

```
the_redacted_protocol/
├── crates/                 # Rust crates
│   ├── rd-core/           # Core agent engine
│   ├── rd-tools/          # Telegram bot & tools
│   ├── rd-types/          # Shared types
│   ├── rd-providers/      # LLM providers
│   ├── rd-cli/            # CLI binary
│   ├── rd-config/         # Configuration
│   ├── rd-session/        # Session management
│   ├── rd-hooks/          # Hook system
│   └── rd-muapi/          # Muapi client
├── dashboard/             # Next.js dashboard
├── airdrop-site/          # Airdrop registration
├── contracts/             # Solana anchor programs
├── images/                # Static assets
├── scripts/               # Deployment scripts
├── .env                   # Environment variables (NOT in git)
├── .env.example           # Template (in git)
└── README.md              # This file
```

### Run Tests

```bash
# Run all Rust tests
cargo test

# Run dashboard tests
cd dashboard
npm test
```

### Code Style

```bash
# Format Rust code
cargo fmt
cargo clippy

# Format JavaScript/TypeScript
cd dashboard
npm run lint
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Colosseum** - For the Agent Hackathon
- **Solana Foundation** - For the blockchain infrastructure
- **OpenRouter** - For multi-LLM routing
- **Pollinations.ai** - For free image generation
- **Muapi.ai** - For advanced AI generation APIs
- **Anchor** - For Solana smart contract framework

---

## 📬 Contact

- **Telegram Bot**: [@theredacted_bot](https://t.me/theredacted_bot)
- **Dashboard**: [redacted-protocol.vercel.app](https://redacted-protocol.vercel.app)
- **GitHub**: [github.com/the-redacted-protocol](https://github.com/the-redacted-protocol)

---

> **"Truth cannot be erased."** 🔴

*The file is breathing.*
