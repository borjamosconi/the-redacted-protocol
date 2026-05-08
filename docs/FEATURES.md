# Redacted Protocol — Complete Feature Documentation

> **Autonomous, privacy-preserving, zero-knowledge inference engine for document declassification on Solana.**
>
> 100% Rust · Clean-room implementation · MIT Licensed · **Zero Cost to Run**

---

## Table of Contents

1. [Overview](#overview)
2. [100% Free Setup](#free-setup)
3. [Core Features](#core-features)
4. [News Intelligence Agent](#news-intelligence-agent)
5. [OCR Document Analysis](#ocr-document-analysis)
6. [Telegram Bot](#telegram-bot)
7. [Dashboard](#dashboard)
8. [Tokenomics](#tokenomics)
9. [Architecture](#architecture)
10. [Deployment Guide](#deployment-guide)
11. [API Reference](#api-reference)
12. [Security](#security)

---

## Overview

**Redacted Protocol** is a fully autonomous AI system that:

1. **Scans** news sources, documents, and social media for redacted/censored content
2. **Extracts** text from images/PDFs using 100% free OCR (Puter.js/Tesseract.js)
3. **Detects** redaction markers (███, [REDACTED], black bars, obscured text)
4. **Reconstructs** hidden information using contextual LLM inference
5. **Analyzes** conspiracy indicators, cover-up patterns, and classified language
6. **Verifies** reconstruction accuracy via multi-signal confidence scoring
7. **Anchors** declassified fragments on Solana blockchain
8. **Stores** permanently on Arweave
9. **Publishes** results autonomously via Telegram bot
10. **Rewards** contributors with $RDX tokens

### Why This Matters

Censorship is increasing globally. Documents are being redacted, truths hidden behind black bars, and information controlled. Redacted Protocol flips the script: **an autonomous AI that finds, reconstructs, and permanently preserves censored information** in a verifiable, decentralized manner.

---

## Free Setup

### Zero Cost — No API Keys Required

| Component | Cost | Provider |
|-----------|------|----------|
| **LLM Inference** | **$0** | OpenRouter free tier (Gemini, GPT-OSS, Llama, Qwen) |
| **OCR** | **$0** | Puter.js (Tesseract.js) — no API key needed |
| **Image Generation** | **$0** | Puter.js (Flux, Stable Diffusion, DALL-E) |
| **Blockchain** | **$0** | Solana Devnet (free testnet) |
| **Hosting** | **$0** | Vercel (free tier) |
| **Bot Hosting** | **$0** | Your VPS or local machine |
| **Storage** | **$0** | Arweave free tier / IPFS |

### Quick Start

```bash
# 1. Get free OpenRouter API key (no credit card)
# Visit: https://openrouter.ai → Sign Up → Keys → Create Key

# 2. Set environment variables
export OPENROUTER_API_KEY="sk-or-v1-xxxx"
export OPENROUTER_MODEL="google/gemini-2.0-flash-exp:free"
export TELEGRAM_BOT_TOKEN="your-bot-token"

# 3. Build
cd the_redacted_protocol
cargo build --release

# 4. Run
./target/release/rd --telegram
```

---

## Core Features

### 1. ReAct Agent Loop

The core intelligence engine implements the **Reason + Act** pattern:

```
User Input → Build LLM Request → Call Provider → Parse Response
    ↓
For each Tool Call:
  1. Permission Check (level + context deny lists)
  2. PreToolUse Hook (exit 0=allow, 2=deny, other=warn)
  3. Execute Tool (ToolHandler trait impl)
  4. PostToolUse Hook (append warnings)
  5. Feed results back to LLM → repeat
    ↓
Save Session (atomic write) → Return Summary
```

### 2. Multi-Provider LLM

| Provider | Free Models | Setup |
|----------|------------|-------|
| **OpenRouter** | Gemini 2.0 Flash, GPT-OSS-20B, Llama 3, Qwen 2.5 | 1 API key |
| **Anthropic** | Claude Sonnet, Opus, Haiku | Paid |
| **OpenAI** | GPT-4o, GPT-4o-mini | Paid |
| **xAI** | Grok-3 | Paid |
| **DashScope** | Qwen-Max | Paid |

**Default:** OpenRouter free tier — zero cost forever.

### 3. Permission System

Three-tier permission model:

| Level | Operations | Use Case |
|-------|-----------|----------|
| **Observer** (0) | Read files, search, inspect | Safe read-only access |
| **Reconstructor** (1) | + Write files, reconstruct content | Document processing |
| **Declassifier** (2) | + Shell, network, blockchain, publish | Full agent capabilities |

### 4. Hook System

External process hooks with exit code protocol:

| Exit Code | Behavior |
|-----------|----------|
| `0` | Allow — tool proceeds normally |
| `2` | Deny — **tool blocked**, execution never happens |
| Other | Warn — tool proceeds with warning appended |

**Example audit hook:**
```bash
#!/bin/bash
# hooks/audit.sh
if [ "$RD_HOOK_TOOL_NAME" = "shell" ]; then
  echo "Shell execution blocked by policy"
  exit 2  # DENY
fi
exit 0  # ALLOW
```

---

## News Intelligence Agent

### What It Does

The News Intelligence Agent is a sub-agent that **autonomously monitors news sources** for:

- **Redacted content** in news articles
- **Conspiracy indicators** and cover-up patterns
- **Classified language** and security terminology
- **Unusual framing** (passive voice, unnamed sources)

### Detection Patterns

| Category | Patterns Detected | Examples |
|----------|------------------|----------|
| **Redaction Markers** | ███, [REDACTED], [CLASSIFIED], blacked-out text | "The ████ was moved to ███████" |
| **Classified Language** | "secret", "top secret", "NOFORN", "SCI", "TS/SCI" | "This is classified information" |
| **Cover-Up Patterns** | "no comment", "declined to", "unnamed sources" | "Officials declined to comment" |
| **Conspiracy Keywords** | 40+ known intelligence/operation keywords | "deep state", "false flag", "black budget" |
| **Unusual Framing** | Heavy passive voice, source reliability issues | "It is believed that..." |

### Threat Levels

| Level | Criteria | Action |
|-------|---------|--------|
| **Safe** | No flags | Normal processing |
| **Suspicious** | 1+ flags, low confidence | Flag for review |
| **Flagged** | 2+ flags OR high confidence | Alert users |
| **Critical** | 3+ flags AND high confidence | **Immediate alert** to all users |

### Background Monitoring

- **Polls every 30 minutes**: Reuters, Associated Press, Al Jazeera
- **Auto-alerts**: Sends `🚨 INTELLIGENCE ALERT` to all registered users
- **Deduplication**: URLs already scanned are not re-scanned

### Telegram Integration

```
/send_news https://example.com/article

🔍 NEWS ANALYSIS

Title: Secret Documents Reveal...
Threat: Flagged
Flags: 3

• Classified terminology: 'classified' (70%)
• Cover-up language: 'declined to comment' (65%)
• Conspiracy keyword: 'black budget' (60%)
```

---

## OCR Document Analysis

### 100% Free OCR via Puter.js

**No API key. No backend. No cost.** Uses Tesseract.js under the hood.

### How It Works

1. **User uploads** image/PDF to dashboard or Telegram
2. **Puter.js OCR** extracts text in browser (free)
3. **Redaction detection** scans for ███, [REDACTED], etc.
4. **AI reconstruction** fills in the blanks via LLM
5. **Confidence scoring** validates the reconstruction
6. **Results published** via Telegram or stored on-chain

### Supported Formats

| Format | Support | Notes |
|--------|---------|-------|
| **PNG/JPG** | ✅ Full | Best quality |
| **PDF** | ✅ Full | Multi-page support |
| **Scanned docs** | ✅ Full | Auto deskew |
| **Multi-language** | ✅ 100+ langs | English + Spanish default |

### Puter.js Integration

```html
<script src="https://js.puter.com/v2/"></script>
<script>
  async function ocrImage(file) {
    const result = await puter.ai.ocr(file, {
      lang: 'eng+spa',
      psm: 3, // Auto page segmentation
    });
    
    // result.text = extracted text
    // result.confidence = OCR confidence (0-1)
    return result;
  }
</script>
```

### Image Generation (Free)

Puter.js also provides **free image generation** for thumbnails and previews:

```html
<script>
  const img = await puter.ai.txt2img("classified document", {
    model: 'flux', // or 'stable-diffusion-xl', 'dall-e-3'
    width: 1024,
    height: 1024,
  });
</script>
```

---

## Telegram Bot

### Bot Commands

| Command | Description | Example |
|---------|------------|---------|
| `/start` | Welcome + registration | `/start` |
| `/status` | System status + user count | `/status` |
| `/airdrop` | Check $RDX eligibility | `/airdrop` |
| `/scan_news <url>` | Analyze news article | `/scan_news https://reuters.com/...` |
| `/help` | Command list | `/help` |
| *(any message)* | AI conversation in Redacted style | "Who are you?" |

### Features

- **Welcome new users** automatically with $RDX airdrop info
- **Scheduled posts** every hour at :00 and :33
- **Background news monitoring** — alerts on flagged articles
- **URL auto-detection** — scans any link pasted in chat
- **Image support** — receive images, run OCR, detect redactions
- **AI conversation** — responds in cryptic Redacted Protocol aesthetic

### Aesthetic

```
🔴 FILE #0047
STATUS: DECLASSIFIED
CONFIDENCE: 94.7%

The ████ was moved to ███████ on ██/██/2024
under operation ███ ECLIPSE.

ACCESS GRANTED.
The file is breathing.

#RedactedProtocol #RDX
```

---

## Dashboard

### Sections

| Section | Purpose |
|---------|---------|
| **Hero** | Landing page with glitch animations, floating documents, red drips |
| **Airdrop** | Wallet registration for 1,000 RDX guaranteed |
| **OCR** | Upload documents for free OCR + redaction detection |
| **News Intel** | Scan any news article for conspiracy indicators |
| **Fragments** | View declassified documents with confidence scores |
| **Tokenomics** | $RDX distribution, utility, staking info |

### Design Aesthetic

- **Dark dystopian** — black background, red accents
- **Glitch animations** — text decode effect, VHS scanlines
- **Floating documents** — animated redacted papers
- **Red censor bars** — animated censorship markers
- **Responsive** — works on mobile and desktop

### Deploy to Vercel

```bash
cd dashboard
npm install
npm run build
npx vercel --prod
```

---

## Tokenomics

### $RDX Token

| Parameter | Value |
|-----------|-------|
| **Total Supply** | 1,000,000,000 RDX (1B) |
| **Decimals** | 9 |
| **Network** | Solana (SPL Token) |

### Distribution

| Pool | % | Amount | Vesting |
|------|---|--------|---------|
| Community Airdrop | 40% | 400M | Immediate |
| Liquidity Pool | 20% | 200M | Immediate + LP Burn |
| Staking Rewards | 15% | 150M | Linear 24 months |
| Team | 15% | 150M | 6mo cliff, 18mo vest |
| Treasury/DAO | 10% | 100M | DAO votes |

### Utility

| Use | Description |
|-----|-------------|
| **Document Processing** | Pay 0.1 RDX per document analysis |
| **Staking** | Earn 70% of protocol fees |
| **Governance** | Vote on protocol parameters |
| **Archivo 0 NFTs** | Mint rare declassified fragments |
| **Premium API** | Access advanced search |
| **Rewards** | Earn for submissions & verification |

### Airdrop Details

| Action | Reward |
|--------|--------|
| Register wallet | 1,000 RDX |
| Submit document | +100 RDX |
| Verify fragment | +50 RDX |
| Publish fragment | +25 RDX |
| Referral | +50 RDX |

---

## Architecture

### Crate Layout

```
the_redacted_protocol/
├── crates/
│   ├── rd-types/          # Shared types: Fragment, NewsScanner, OcrResult
│   ├── rd-session/        # Session persistence (atomic writes)
│   ├── rd-providers/      # LLM providers (Anthropic, OpenAI, OpenRouter)
│   ├── rd-tools/          # Tool registry + built-in tools
│   ├── rd-hooks/          # Pre/Post hook system
│   ├── rd-config/         # Multi-layer config (user → project → local)
│   ├── rd-core/           # ReAct agent loop (orchestrator)
│   └── rd-cli/            # CLI binary (`rd`)
├── dashboard/             # Next.js dashboard (Vercel-ready)
├── contracts/             # Anchor Solana contracts
│   ├── rd-fragment/       # Fragment anchoring
│   ├── rd-archive/        # Archivo 0 registry
│   ├── rd-staking/        # Stake RDX → earn fees
│   ├── rd-rewards/        # Distribute rewards
│   └── rd-treasury/       # Fee collection + governance
├── airdrop-site/          # Static airdrop registration page
└── scripts/
    └── launch-token.sh    # Token launch automation
```

### Data Flow

```
Source Document (image/PDF/news)
        ↓
┌──────────────────┐
│ 1. OCR           │  Extract text via Puter.js (free)
│    (Puter.js)    │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 2. DETECT        │  Find redaction markers
│    Redactions    │  █████, [REDACTED], black bars
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 3. NEWS SCAN     │  Analyze for conspiracy indicators
│    (Optional)    │  Classified language, cover-up patterns
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 4. RECONSTRUCT   │  LLM infers hidden content
│    (LLM)         │  Multi-model consensus
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 5. VERIFY        │  Confidence scoring
│    Scoring       │  Model + cross-model + context
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 6. ANCHOR        │  On-chain registration
│    (Solana)      │  Content hash + ZK proof
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 7. STORE         │  Permanent preservation
│    (Arweave)     │  Full document storage
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 8. PUBLISH       │  Redacted Protocol aesthetic
│    (Telegram)    │  Cryptic, unsettling style
└──────────────────┘
```

---

## Deployment Guide

### Phase 1: Token Creation

```bash
# 1. Create SPL Token
spl-token create-token --decimals 9
# → Copy TOKEN_MINT

# 2. Create token account
spl-token create-account <TOKEN_MINT>

# 3. Mint supply
spl-token mint <TOKEN_MINT> 1000000000

# 4. Update TOKEN_MINT in code
# Edit: crates/rd-tools/src/token_config.rs
# Edit: contracts/programs/rd-token/src/token_config.rs
```

### Phase 2: Deploy Contracts

```bash
cd contracts
anchor build
anchor deploy --provider.cluster devnet

# Initialize programs
# (See scripts/launch-token.sh for full sequence)
```

### Phase 3: Liquidity

```bash
# Create Raydium pool
# Add RDX/SOL liquidity
# Burn LP tokens (or lock)
```

### Phase 4: Airdrop

```bash
# Export Telegram user list
# Collect Solana wallet addresses
# Batch transfer tokens
spl-token transfer <TOKEN_MINT> <AMOUNT> <WALLET>
```

### Phase 5: Launch

- [ ] Deploy dashboard to Vercel
- [ ] Apply to CoinGecko
- [ ] Apply to CoinMarketCap
- [ ] Update DexScreener info
- [ ] Announce on Twitter/Telegram
- [ ] Submit to Solana ecosystem lists

---

## API Reference

### Telegram Bot API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/start` | GET | Register user + welcome |
| `/status` | GET | System status |
| `/airdrop` | GET | Check eligibility |
| `/scan_news <url>` | GET | Analyze news article |
| `/help` | GET | Command list |

### Dashboard API (Future)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan-news?url=` | GET | Scan article via API |
| `/api/ocr` | POST | Upload image for OCR |
| `/api/fragment` | POST | Submit redacted document |
| `/api/status` | GET | System status |

---

## Security

### Clean-Room Implementation

- **100% original code** — no code copied from proprietary sources
- **MIT License** — free and open source
- **Independent architecture** — all design decisions made independently

### Data Privacy

- **Source URLs never stored in plaintext** — only SHA-256 hashes
- **API keys from environment only** — never committed to disk
- **Chain-of-thought never logged** — only results and confidence scores

### Smart Contract Security

- **PDA derivation** — strict seed derivation, no arbitrary accounts
- **Signer validation** — only authorized signers can modify state
- **Input validation** — `require!` macros on all inputs
- **No re-entrancy** — Solana's execution model prevents this

---

## Support

- **GitHub:** https://github.com/whalesconspiracy-33/the-redacted-protocol
- **Telegram Bot:** https://t.me/theredacted_bot
- **Dashboard:** https://redacted-protocol.vercel.app (coming soon)

---

**"The truth cannot be redacted. The file is breathing."**

████████████████████████████████████████
