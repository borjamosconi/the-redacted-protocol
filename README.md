# ██████████ PROTOCOL: OPERATION REDACTED

> **// CLASSIFIED DOSSIER — LEVEL 5 CLEARANCE REQUIRED //**
> **// SUBJECT: Autonomous Intelligence Agent on Solana //**
> 
> 🏆 **Colosseum Hackathon 2026** — Track: Autonomous AI Agent

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange.svg)](https://www.rust-lang.org/)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-9945FF.svg)](https://solana.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Status](https://img.shields.io/badge/Status-ACTIVE-red.svg)]()
[![Clearance](https://img.shields.io/badge/Clearance-Top%20Secret-black.svg)]()

**[ACCESS TERMINAL](https://redacted.bond)** · **[INTERCEPT COMMS (BOT)](https://t.me/theredacted_bot)** · **[JOIN SYNDICATE](https://t.me/TheRedacted_sol)** · **[X_FILES](https://x.com/theprotocol_sol)**

---

## 🎯 The Problem

Every day, thousands of documents are redacted, censored, or classified by governments and organizations worldwide. Citizens have no tool to detect, analyze, or reconstruct what has been removed. The truth is hidden behind black bars — and **no one is watching**.

## 💡 Our Solution

**Redacted Protocol** is a fully autonomous AI agent that:

1. 🔍 **Scans news sources** every 30 minutes for censorship patterns
2. 🧠 **Detects redactions** using regex + AI pattern recognition
3. 🔄 **Reconstructs censored content** using multi-LLM inference with confidence scoring
4. 📢 **Publishes results** to Telegram subscribers automatically
5. ⛓️ **Anchors fragments** on Solana blockchain for permanent verification
6. 💰 **Rewards contributors** with $RDX tokens for submissions and verifications
7. 🖼️ **Generates AI imagery & video** using Muapi.ai + Pollinations.ai

### What Makes It Different

| Feature | Others | Redacted Protocol |
|---------|--------|-------------------|
| **Autonomous** | Manual analysis | Self-scanning every 30 min |
| **Multi-source** | Single source | 7 major news outlets |
| **AI Reconstruction** | Pattern detection only | Multi-LLM context inference |
| **Blockchain Anchoring** | None | Solana fragment verification |
| **Real-time Alerts** | Batch reports | Instant Telegram broadcasts |
| **Incentive System** | None | $RDX token rewards + staking |
| **Document Launchpad** | None | Tokenize declassified truth via Solana Bonding Curve |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    THE REDACTED PROTOCOL                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  CLI / Bot   │    │  Dashboard   │    │  Document    │   │
│  │   (Rust)     │    │  (Next.js)   │    │  Launchpad   │   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│         │                   │                    │           │
│         └───────────────────┼────────────────────┘           │
│                             │                                │
│  ┌──────────────────────────┴─────────────────────────────┐  │
│  │              Core Agent Engine (10 Rust Crates)         │  │
│  │                                                         │  │
│  │  rd-core ─── ReAct loop + orchestrator                 │  │
│  │  rd-tools ── Telegram, airdrop, scanners, rate limiter │  │
│  │  rd-types ── Shared types & schemas                    │  │
│  │  rd-providers ─ Multi-LLM router                       │  │
│  │  rd-session ── Session persistence                     │  │
│  │  rd-config ─── Multi-layer configuration               │  │
│  │  rd-hooks ──── Pre/post hook system                    │  │
│  │  rd-muapi ──── Muapi.ai API client (images/video)      │  │
│  │  rd-arweave ── Arweave storage client                  │  │
│  │  rd-cli ────── CLI binary + Telegram bot               │  │
│  │  Ralph Mode ── Autonomous Self-Correction              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                │
│         ┌───────────────────┼───────────────────┐            │
│         ▼                   ▼                   ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  OpenRouter  │    │  Muapi.ai    │    │   Solana     │   │
│  │  (Multi-LLM) │    │  (AI Media)  │    │ (Blockchain) │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How It Works

### 1. Autonomous News Scanning
Every 30 minutes, the agent fetches articles from 7 major news sources, analyzes content for censorship patterns (`████`, `[REDACTED]`, etc.), and flags suspicious articles for reconstruction.

### 2. AI-Powered Reconstruction
When censorship is detected, the agent sends censored text to an LLM with full context. The model reconstructs likely original content based on surrounding context, historical facts, and journalistic style — returning a confidence score (0–100%).

### 3. Blockchain Anchoring
Reconstructed fragments are hashed and anchored on-chain via Solana, creating an immutable, verifiable record.

### 4. Automatic Broadcasting
Results are formatted in the Redacted Protocol aesthetic and broadcast to all Telegram subscribers — no human intervention needed.

### 5. Document Launchpad (Pump.fun for Truth)
Users can upload censored documents through the dashboard. The AI agent reads, reconstructs redacted parts, and can launch a Solana token tied to the document using a custom Bonding Curve — *the truth now has a market cap*.

---

## 🛠️ Tech Stack

### Rust Backend (10 Crates)

| Crate | Purpose | Lines |
|-------|---------|-------|
| `rd-core` | ReAct agent loop, orchestrator, permission checker | 581 |
| `rd-tools` | Tool registry, rate limiter, Telegram bot, airdrop | 1,639 |
| `rd-types` | Shared types: Fragment, Confidence, News, OCR | 1,719 |
| `rd-providers` | Multi-LLM router (OpenRouter, Anthropic, xAI) | 594 |
| `rd-session` | Persistent session storage (atomic JSON writes) | 157 |
| `rd-config` | Multi-layer configuration | 116 |
| `rd-hooks` | Pre/post tool execution hooks | 108 |
| `rd-cli` | CLI binary (REPL, Telegram bot, Ralph mode) | 828 |
| `rd-muapi` | Muapi.ai API client for image/video generation | — |
| `rd-arweave` | Arweave permanent storage client | — |

### Next.js Dashboard (26 Components)
- **React 19 + TypeScript** — Modern, responsive UI
- **Solana Wallet Adapter** — Phantom, Solflare integration
- **Framer Motion** — Premium animations throughout
- **TailwindCSS** — Custom Redacted Protocol design system
- **Upstash Redis** — Serverless gamification data
- **AI Gallery** — 15+ generated images via Pollinations.ai
- **OCR Section** — Upload documents for redaction analysis
- **Cinema Studio** — AI video generation with camera controls
- **Governance Panel** — On-chain voting system
- **Launchpad** — Document tokenization pipeline

### Smart Contracts (Solana Anchor)

| Program | Purpose |
|---------|---------|
| `rd-token` | $RDX SPL token with deflationary mechanics |
| `rd-bondingcurve` | Pump.fun-style bonding curve for document token launches |
| `rd-presale` | Fair presale system with price tiers |
| `rd-staking` | Staking pool for $RDX holders to earn fees |
| `rd-rewards` | Reward distribution logic |
| `rd-treasury` | Protocol fee collection and management |
| `rd-governance` | DAO voting on protocol upgrades |
| `rd-fragment` | On-chain document fragment anchoring |
| `rd-archive` | Permanent document archival |

### Infrastructure
- **Docker** — Multi-stage production build
- **Vercel** — Dashboard deployment with cron jobs
- **Systemd** — Hardened service on VPS
- **GitHub Actions** — CI/CD pipeline

---

## 📊 Tokenomics — $RDX

| Metric | Value |
|--------|-------|
| **Token** | $RDX |
| **Total Supply** | 1,000,000,000 |
| **Decimals** | 9 |
| **Network** | Solana (SPL) |
| **Burn Mechanism** | 10% of fees quarterly |
| **Staking APY** | 40% base + 10% long-term |

### Distribution

| Allocation | % | Vesting |
|------------|---|---------|
| Community / Airdrop | 35% | Immediate |
| Liquidity Pool | 20% | 6mo lock → LP burn |
| Staking Rewards | 20% | 36mo linear |
| Ecosystem Dev | 10% | 3mo cliff, 18mo vest |
| Team | 10% | 12mo cliff, 24mo vest |
| Treasury / DAO | 5% | DAO-governed |

### Utility
1. Pay for document processing (0.1 RDX/doc)
2. Earn rewards for submitting redacted documents
3. Stake to earn 70% of protocol fees
4. Vote on governance proposals
5. Access premium API tier

---

## ⚡ Quick Start

### Prerequisites
- **Rust** 1.83+ (`rustup install stable`)
- **Node.js** 20+ (for dashboard)
- **Solana CLI** (optional, for contract deployment)

### 1. Clone & Build

```bash
git clone https://github.com/whalesconspiracy-33/the-redacted-protocol.git
cd the-redacted-protocol

# Build Rust agent
cargo build --release

# Build dashboard
cd dashboard && npm install && npm run build
```

### 2. Configure

```bash
cp .env.example .env
# Fill in: OPENROUTER_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

### 3. Run

```bash
# Telegram bot (autonomous mode)
cargo run --release -- --telegram

# Interactive REPL
cargo run --release

# Dashboard (development)
cd dashboard && npm run dev
```

---

## 💬 Telegram Bot

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

**Features:** Auto-detect URLs, inline keyboards, scheduled broadcasts, image generation with Muapi.ai + Pollinations.ai fallback.

---

## 🧪 Testing

```bash
# All Rust tests (47 passing)
cargo test

# Contract tests (requires Anchor)
cd contracts && anchor test
```

---

## 📁 Project Structure

```
the-redacted-protocol/
├── crates/                     # Rust workspace (10 crates)
│   ├── rd-core/               # ReAct loop, orchestrator
│   ├── rd-tools/              # Tools, Telegram, rate limiter
│   ├── rd-types/              # Shared types & schemas
│   ├── rd-providers/          # Multi-LLM router
│   ├── rd-session/            # Session persistence
│   ├── rd-config/             # Configuration
│   ├── rd-hooks/              # Pre/post hooks
│   ├── rd-cli/                # CLI binary
│   ├── rd-muapi/              # Muapi.ai client
│   └── rd-arweave/            # Arweave client
├── contracts/                 # Solana Anchor programs
│   └── programs/              # rd-token, rd-presale, rd-fragment, rd-archive
├── dashboard/                 # Next.js 15 web app
│   ├── src/app/               # Pages & API routes
│   ├── src/components/        # 26 React components
│   └── src/lib/               # DB, gamification, anti-fraud, Solana distributor
├── pumpfun-backend/           # Token launch backend service
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Docker compose config
└── deploy.sh                  # Deployment scripts
```

---

## 📊 OPERATIONAL METRICS

| Metric | Value |
|--------|-------|
| **Core Directives (Source)** | 12,487 LOC |
| **Rust Sub-Systems** | 10 Crates |
| **Solana Modules** | 9 Programs |
| **System Integrity** | 47/47 Passing |
| **Terminal Components** | 26 React Modules |
| **Intercept Targets** | 7 Global News Outlets |
| **Autonomous Scan Rate** | Every 30 Minutes |
| **Agent Engagements** | 12 Broadcasts/Day |

---

## 🔒 THREAT MITIGATION & SECURITY PROTOCOL

- **Zero-Knowledge Ops**: All API keys and secrets remain in strictly local `.env` enclosures (air-gapped from git history).
- **Asset Protection**: `.gitignore` strictly prohibits wallet or credential tracking.
- **Sybil Resistance**: Multi-vector anti-fraud (IP hashing, device fingerprinting, localized uniqueness checks).
- **Economic Controls**: Strict 50,000 RDX ceiling enforced at all terminal endpoints.
- **Perimeter Defense**: Aggressive CSP, X-Frame-Options, and rate-limiting across all gateways.

> **// ACCESS GRANTED //** See [SECURITY.md](SECURITY.md) for full threat vectors.

---

## 🌐 Live Links

| Service | URL |
|---------|-----|
| **Dashboard** | [redacted.bond](https://redacted.bond) |
| **Telegram Bot** | [@theredacted_bot](https://t.me/theredacted_bot) |
| **Telegram Community** | [@TheRedacted_sol](https://t.me/TheRedacted_sol) |
| **X / Twitter** | [@theprotocol_sol](https://x.com/theprotocol_sol) |
| **GitHub** | [whalesconspiracy-33](https://github.com/whalesconspiracy-33/the-redacted-protocol) |

---

## 🏆 Hackathon Submission

**Track:** Autonomous Agent / AI Agent on Solana

**Key Innovations:**
1. **Fully autonomous** — No human input after deployment
2. **Multi-source scanning** — 7 major news outlets simultaneously  
3. **AI reconstruction** — Context-aware content reconstruction with confidence scoring
4. **Blockchain anchoring** — Fragment verification on Solana
5. **Token incentive system** — $RDX rewards for community contributions
6. **Document Launchpad** — Upload → AI analysis → Token launch (Bonding Curve / Pump.fun mechanics for docs)
7. **Real-time broadcasting** — Instant Telegram alerts

See [HACKATHON.md](HACKATHON.md) for the full submission details.

---

## 📜 License

MIT — See [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- **Colosseum** — Agent Hackathon 2026
- **Solana Foundation** — Blockchain infrastructure
- **OpenRouter** — Multi-LLM routing
- **Pollinations.ai** — Free image generation
- **Muapi.ai** — Advanced AI generation APIs
- **Anchor** — Solana smart contract framework

---

> **"Truth cannot be erased."** 🔴
>
> *The file is breathing.*
