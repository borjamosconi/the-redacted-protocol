# 🏆 Hackathon Submission — Redacted Protocol

## Track: Autonomous Agent / Neural Engine on Solana

---

## 📋 Submission Details

**Project Name:** Redacted Protocol

**Tagline:** Autonomous Inference Engine that detects, reconstructs, and tokenizes suppressed content via bonding curves

**Team:** whalesconspiracy (solo developer)

**GitHub:** https://github.com/whalesconspiracy-33/the-redacted-protocol

**Live Demo:** https://redacted.bond

**Telegram Bot:** https://t.me/theredactedprotocol_bot

---

## 🎬 Demo Video

*(Recording in progress — see live dashboard at https://redacted.bond)*

**Suggested video structure (3-5 minutes):**
1. **0:00-0:30** — Show the problem: censored documents, hidden truth
2. **0:30-1:30** — Show the autonomous bot working: Telegram receiving auto-scans
3. **1:30-2:30** — Show dashboard: upload a suppressed document, Neural Engine reconstructs it
4. **2:30-3:30** — The "Pump.fun for Truth" feature: Launch a token tied to the declassified document
5. **3:30-4:30** — Show the autonomous inference engine scanning news autonomously
6. **4:30-5:00** — Close: architecture overview, future roadmap

---

## 📖 Description

Every day, governments and organizations suppress thousands of documents. Redacted Protocol is an autonomous inference engine that:

1. **Monitors** 7 major news sources every 30 minutes
2. **Detects** censorship patterns (████, [REDACTED], etc.)
3. **Reconstructs** censored content using LLM inference with confidence scoring
4. **Publishes** results to Telegram and X (Twitter) automatically
5. **Anchors** verified fragments on Solana blockchain
6. **Tokenizes** high-value declassified documents via a Bonding Curve (Pump.fun mechanics)
7. **Rewards** community contributors with $RDX tokens
8. **Manifesto** — Operates under a strict philosophical framework for truth declassification

### What Makes It Unique

- **Fully autonomous** — No human input needed after deployment
- **Real-time** — Instant Telegram broadcasts when censorship is found
- **Multi-source** — Scans Reuters, AP, Al Jazeera, The Guardian, BBC, CNN, NYT
- **Inference-powered** — Context-aware reconstruction, not just pattern matching
- **Blockchain-backed** — Fragment verification on Solana
- **Document Launchpad** — The first platform to tokenize declassified truth via a Solana Bonding Curve
- **Incentivized** — Token rewards create a self-sustaining ecosystem

---

## 🏗️ How It Works

### Autonomous Loop
```
Every 30 minutes:
  1. Fetch articles from 7 news sources
  2. Analyze for censorship patterns
  3. If censorship detected → Reconstruct with LLM
  4. Publish results to all Telegram subscribers
  5. Log and anchor fragments on Solana
```

### Document Analysis Pipeline
```
Upload document → Detect redactions → Neural reconstruct → Show results → Optional: publish to Telegram
```

### Token System & Document Launchpad
```
Submit suppressed doc → Neural Reconstructs → Document becomes tradeable
Token Launch → Fair launch via Bonding Curve (Pump.fun mechanics)
Stake RDX → Earn protocol fees from document trading volume
```

---

## 🛠️ Technology

### Backend
- **Rust** — 10 crates, 5,742+ lines of code
- **ReAct Loop** — Autonomous reasoning + action cycle
- **Multi-LLM** — OpenRouter (free), Anthropic, OpenAI, xAI
- **Rate Limiting** — Sliding window for all operations
- **Session Persistence** — Atomic JSON writes

### Smart Contracts
- **Solana Anchor** — 9 programs
- **Token SPL** — $RDX with deflationary mechanics
- **Bonding Curve** — `rd-bondingcurve` for document token launches
- **Presale & Staking** — `rd-presale`, `rd-staking`, `rd-rewards`
- **Governance & Treasury** — `rd-governance`, `rd-treasury`
- **Fragment & Archive** — On-chain anchoring with verification

### Frontend
- **Next.js 15** — React 19, TypeScript
- **Solana Wallet Adapter** — Phantom, Solflare
- **Framer Motion** — Animations
- **TailwindCSS** — Redacted Protocol aesthetic

### Infrastructure
- **Docker** — Multi-stage build
- **Systemd** — Service with hardening
- **Vercel** — Dashboard deployment

---

## 📊 Tokenomics

| Metric | Value |
|--------|-------|
| Token | $RDX |
| Total Supply | 1,000,000,000 |
| Network | Solana (SPL) |
| Burn Mechanism | 10% of fees quarterly |
| Staking APY | 40% base + 10% long-term bonus |

### Distribution
- 25% Community/Airdrop (immediate)
- 15% **Presale (Preventa)** (30% TGE, 70% linear 12mo)
- 15% Liquidity Pool (6mo lock → burn)
- 20% Staking Rewards (36mo linear)
- 10% Ecosystem Development (3mo cliff)
- 10% Team (12mo cliff, 24mo vest)
- 5% Treasury/DAO (DAO-governed)

---

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/whalesconspiracy-33/the-redacted-protocol.git
cd the-redacted-protocol

# Build
cargo build --release

# Configure
cp .env.example .env
# Add: OPENROUTER_API_KEY, TELEGRAM_BOT_TOKEN

# Run Telegram Bot (autonomous mode)
cargo run --release -- --telegram

# Run Dashboard
cd dashboard && npm install && npm run dev
```

---

## 📈 Metrics

| Metric | Value |
|--------|-------|
| Lines of Code | 12,487+ (source) / 26,833+ (total) |
| Rust Crates | 10 |
| Solana Programs | 9 |
| Tests | 47 passing, 0 failing |
| API Endpoints | 8 |
| React Components | 26 |
| Telegram Commands | 7 |
| News Sources | 7 |
| Autonomous Scan Interval | 30 minutes |

---

## 🎯 Challenges We Overcame

1. **Autonomous Operation** — Built a self-sustaining agent that works without human intervention
2. **Multi-LLM Routing** — Created a provider abstraction for fallback and cost optimization
3. **Rate Limiting** — Implemented sliding window limits across all operations
4. **Persistence** — File-based database that survives restarts
5. **Anti-Sybil** — IP hashing, device fingerprinting, wallet uniqueness checks
6. **Token Cap Enforcement** — 50,000 RDX per-user ceiling enforced at every entry point

---

## 🔮 Future Plans

- [ ] Deploy token on Solana devnet/mainnet
- [ ] Launch staking program with real token transfers
- [ ] Build Raydium liquidity pool
- [ ] Implement DAO governance
- [ ] Mobile app for iOS/Android
- [ ] Browser extension for real-time web censorship detection
- [ ] Partnerships with journalism organizations

---

## 📜 License

MIT

---

## 👤 Contact

- **GitHub:** https://github.com/whalesconspiracy-33
- **Telegram:** https://t.me/theredactedprotocol_bot
- **Dashboard:** https://redacted.bond
- **Community:** https://t.me/TheRedacted_sol
- **X / Twitter:** https://x.com/theprotocol_sol
