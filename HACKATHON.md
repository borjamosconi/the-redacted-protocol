# 🔴 Redacted Protocol — Autonomous Neural System for Document Declassification

> **Colosseum Agent Hackathon — Solana**
>
> An autonomous intelligence engine that detects, reconstructs, and declassifies restricted content in news articles and documents. Built 100% in Rust with Solana anchoring, Telegram broadcasting, and a Next.js dashboard.

[![Rust](https://img.shields.io/badge/Rust-1.83-orange)](https://www.rust-lang.org/)
[![Solana](https://img.shields.io/badge/Solana-1.18-purple)](https://solana.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/Tests-47%20passing-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)

---

## 🎯 The Problem

Every day, thousands of documents are redacted, censored, or classified by governments and organizations. Citizens have no tool to detect, analyze, or reconstruct what has been removed. The truth is hidden behind black bars — and no one is watching.

## 💡 Our Solution

**Redacted Protocol** is an autonomous neural engine that:

1. **Scans news sources** every 30 minutes for censorship patterns
2. **Detects redactions** using regex + heuristic pattern recognition
3. **Reconstructs censored content** using multi-vector inference with confidence scoring
4. **Publishes results** to Telegram subscribers automatically
5. **Anchors fragments** on Solana blockchain for permanent verification
6. **Tokenizes documents** via a custom Bonding Curve (Pump.fun mechanics)
7. **Rewards contributors** with $RDX tokens for submissions and verifications

### What Makes It Different

| Feature | Others | Redacted Protocol |
|---------|--------|-------------------|
| **Autonomous** | Manual analysis | Self-scanning every 30 min |
| **Multi-source** | Single source | 7 major news outlets |
| **Neural Reconstruction** | Pattern detection only | Inference-powered context recovery |
| **Blockchain Anchoring** | None | Solana fragment verification |
| **Real-time Alerts** | Batch reports | Instant Telegram broadcasts |
| **Document Launchpad** | None | Tokenize truth via Solana Bonding Curve |
| **Incentive System** | None | Token rewards + staking |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REDACTED PROTOCOL                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              AUTONOMOUS ENGINE (Rust)                 │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │  │
│  │  │ReAct Loop│  │Providers │  │Tool Registry       │  │  │
│  │  │          │  │OpenRouter│  │• OCR (Puter.js)    │  │  │
│  │  │Reconstruct│  │Anthropic │  │• Shell, Grep      │  │  │
│  │  │Verify    │  │OpenAI    │  │• Telegram Publish  │  │  │
│  │  │Anchor    │  │xAI       │  │• News Scanner      │  │  │
│  │  └──────────┘  └──────────┘  └────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │  │
│  │  │Rate Limit│  │Session   │  │Hooks               │  │  │
│  │  │Sliding   │  │Store     │  │Pre/Post Tool Use   │  │  │
│  │  │Window    │  │Persistent│  │Permission Checks   │  │  │
│  │  └──────────┘  └──────────┘  └────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         ▼                 ▼                 ▼              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │  Telegram   │  │   Solana    │  │   Dashboard     │    │
│  │  Bot 24/7   │  │  Contracts  │  │   Next.js 15    │    │
│  │             │  │             │  │                 │    │
│  │• Auto-scan  │  │• Fragment   │  │• Upload docs    │    │
│  │• Broadcast  │  │• Staking    │  │• OCR Analysis   │    │
│  │• Commands   │  │• Token RDX  │  │• Neural Recon   │    │
│  │• Airdrop    │  │• Treasury   │  │• Gamification   │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How It Works

### 1. Autonomous News Scanning

Every 30 minutes, the agent:
- Fetches articles from 7 major news sources
- Analyzes content for censorship patterns (████, [REDACTED], etc.)
- Detects redaction markers and classifies threat level
- Flags suspicious articles for reconstruction

### 2. Neural Reconstruction

When censorship is detected:
- Engine sends censored text to a high-fidelity inference provider with context
- System reconstructs likely original content based on:
  - Surrounding context and historical facts
  - Journalistic style and logical flow
  - Cross-referencing known events
- Returns reconstruction with confidence score (0-100%)

### 3. Cross-Platform Broadcasting

Reconstructed articles are:
- Formatted in Redacted Protocol aesthetic
- Sent to all Telegram subscribers instantly
- **Automatically tweeted to X (Twitter)** every 8 hours
- Includes original (censored) + reconstruction + confidence
- Never requires human intervention

### 4. Dashboard Interaction

Users can:
- **Upload** censored documents (text, images via OCR)
- **Analyze** automatic redaction detection
- **Reconstruct** via neural-triangulation with confidence scoring
- **Tokenize** truth: Launch a token for the document via the Bonding Curve
- **Track** progress in real-time
- **Earn** XP and $RDX rewards for contributions

---

## 📊 Tokenomics — $RDX

| Metric | Value |
|--------|-------|
| **Total Supply** | 1,000,000,000 RDX |
| **Decimals** | 9 |
| **Network** | Solana (SPL Token) |
| **Mint Authority** | Revoked after distribution |
| **Burn Mechanism** | 10% of fees burned quarterly |

### Distribution

| Allocation | % | Amount | Vesting |
|------------|---|--------|---------|
| Community/Airdrop | 25% | 250M | Immediate |
| **Presale (Preventa)** | 15% | 150M | 30% TGE, 70% linear 12mo |
| Liquidity Pool | 15% | 150M | 6mo lock → LP burn |
| Staking Rewards | 20% | 200M | 36mo linear |
| Ecosystem Dev | 10% | 100M | 3mo cliff, 18mo vest |
| Team | 10% | 100M | 12mo cliff, 24mo vest |
| Treasury/DAO | 5% | 50M | DAO-governed |

### Utility

1. Pay for document processing (0.1 RDX/doc)
2. Earn rewards for submitting redacted documents
3. Stake to earn 70% of protocol fees
4. Vote on governance proposals
5. Access premium API tier

---

## 🛠️ Tech Stack

### Backend (Rust — 10 Crates)
| Crate | Purpose | Lines |
|-------|---------|-------|
| **rd-core** | ReAct loop, Orchestrator, Permission Checker | 581 |
| **rd-tools** | Tool Registry, Rate Limiter, Airdrop, Telegram | 1,639 |
| **rd-types** | Shared types: Fragment, Confidence, News | 1,719 |
| **rd-providers** | Multi-provider Router (OpenRouter, Anthropic, etc.) | 594 |
| **rd-session** | Persistent session storage (atomic writes) | 157 |
| **rd-config** | Multi-layer configuration | 116 |
| **rd-hooks** | Pre/Post tool execution hooks | 108 |
| **rd-cli** | CLI binary (REPL, Telegram bot, Verification loop) | 828 |
| **rd-muapi** | Muapi.ai API client (visual asset generation) | — |
| **rd-arweave** | Arweave permanent storage client | — |

### Frontend (Next.js 15)
- React 19 + TypeScript
- Solana Wallet Adapter (Phantom, Solflare)
- TailwindCSS + Framer Motion animations
- TanStack React Query + Zustand
- File-based database (`.rdx-data/`)

### Infrastructure
- Docker multi-stage build + docker-compose
- Systemd service with security hardening
- GitHub Actions (planned)

---

## 🏃 Quick Start

### Prerequisites
```bash
# Rust 1.83+
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js 20+
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
```

### Clone & Build
```bash
git clone https://github.com/whalesconspiracy-33/the-redacted-protocol.git
cd the-redacted-protocol

# Build Rust agent
cargo build --release

# Build dashboard
cd dashboard
npm install
npm run build
```

### Configure
```bash
cp .env.example .env
# Fill in your API keys:
# - OPENROUTER_API_KEY (free tier available)
# - TELEGRAM_BOT_TOKEN (from @BotFather)
# - SOLANA_RPC_URL (devnet for testing)
```

### Run
```bash
# Telegram bot (autonomous mode)
cargo run --release -- --telegram

# Interactive REPL
cargo run --release

# One-shot prompt
cargo run --release -- --prompt "Analyze this redacted document..."

# Dashboard
cd dashboard && npm run start

# Solana Devnet (Hackathon Ready)
./DEPLOY-DEVNET.ps1
./SEED-TOKENS.ps1
```

---

## 🧪 Testing

```bash
# Run all Rust tests
cargo test

# Run contract tests (requires Anchor)
cd contracts && anchor test

# All 47 tests passing ✓
```

---

## 📁 Project Structure

```
the-redacted-protocol/
├── crates/                     # Rust workspace (8 crates)
│   ├── rd-core/               # ReAct loop, orchestrator
│   ├── rd-tools/              # Tools, rate limiter, airdrop
│   ├── rd-types/              # Shared types
│   ├── rd-providers/          # Inference providers
│   ├── rd-session/            # Session persistence
│   ├── rd-config/             # Configuration
│   ├── rd-hooks/              # Pre/post hooks
│   └── rd-cli/                # CLI binary
├── contracts/                 # Solana Anchor programs
│   ├── programs/              # 9 programs
│   │   ├── rd-token/          # Token metadata & mechanics
│   │   ├── rd-bondingcurve/   # Pump.fun-style document tokenization
│   │   ├── rd-presale/        # Fair presale system
│   │   ├── rd-staking/        # Staking pool for fee sharing
│   │   ├── rd-rewards/        # Reward distribution logic
│   │   ├── rd-treasury/       # Treasury management
│   │   ├── rd-governance/     # DAO voting mechanics
│   │   ├── rd-fragment/       # Fragment anchoring
│   │   └── rd-archive/        # Permanent document archival
│   └── tests/                 # 6 TypeScript test files
├── dashboard/                 # Next.js 15 web app
│   ├── src/app/api/           # 8 API routes
│   ├── src/components/        # 12 React components
│   └── src/lib/               # Utilities (db, gamification, antifraud)
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Docker compose config
├── deploy.sh                  # VPS deployment script
├── deploy_rdx_token.sh        # Token deployment script
└── deploy-presale-system.sh   # Presale system deployment
```

---

## 🌐 Live Links

| Service | URL |
|---------|-----|
| **Dashboard** | https://redacted.bond |
| **Telegram Bot** | https://t.me/theredactedprotocol_bot |
| **Telegram Community** | https://t.me/TheRedacted_sol |
| **X / Twitter** | https://x.com/theprotocol_sol |
| **GitHub** | https://github.com/whalesconspiracy-33/the-redacted-protocol |

---

## 🏆 Hackathon Submission

**Track:** Autonomous System on Solana

**What we built:**
An autonomous neural engine that continuously monitors news sources for censorship, reconstructs redacted content using neural triangulation, and publishes results to Telegram subscribers — all without manual intervention.

**Key innovations:**
1. **Fully autonomous** — No manual input needed after deployment
2. **Multi-source scanning** — 7 major news outlets simultaneously
3. **Neural reconstruction** — Context-aware content reconstruction with confidence scoring
4. **Blockchain anchoring** — Fragment verification on Solana
5. **Document Launchpad** — The first platform to tokenize declassified truth via a Solana Bonding Curve
6. **Token incentive system** — $RDX rewards for community contributions
7. **Real-time broadcasting** — Instant Telegram alerts

**Demo:** *(Recording in progress — see live dashboard at https://redacted.bond)*

---

## 👥 Team

**Moskoni** — Solo developer / systems architect

---

## 📜 License

MIT — See [LICENSE](./LICENSE)

---

## 🔮 Roadmap

- [x] Autonomous news scanning
- [x] Neural reconstruction
- [x] Telegram bot with auto-broadcast
- [x] Dashboard with document upload
- [x] Airdrop system with persistence
- [x] Tokenomics v2.0 (deflationary)
- [x] Rate limiting
- [x] Verification loop (verify/repair)
- [x] Deploy token on devnet
- [x] Deploy contracts on devnet
- [x] Solana fragment anchoring (live)
- [ ] Raydium liquidity pool
- [x] Staking program launch
- [x] DAO governance (initialized)
- [ ] Mobile app
- [ ] Browser extension for real-time web censorship detection
