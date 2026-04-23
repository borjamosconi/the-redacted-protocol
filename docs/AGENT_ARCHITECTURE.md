# Redacted Protocol — Autonomous Agent Architecture

## Overview
The Redacted Protocol Agent is a state-of-the-art autonomous intelligence designed to detect, reconstruct, and declassify information on the Solana blockchain. It operates using a modular architecture that combines multi-modal reasoning with high-performance generation tools.

---

## Core Components

### 1. OpenClaw (Orchestration Engine)
**OpenClaw** is the brain of the agent. It implements a **ReAct (Reasoning + Action)** loop that allows the agent to:
- **Analyze** incoming data fragments.
- **Formulate** a plan of action.
- **Execute** tools (Search, OCR, Muapi).
- **Verify** the output before publication.

### 2. ElizaOS (Personality & Social Layer)
**ElizaOS** handles the agent's "soul." It manages:
- **Social Integration**: Telegram and X (Twitter) interaction.
- **Personality Consistency**: Ensures the agent maintains its "Redacted" persona—mysterious, technical, and slightly paranoid.
- **Memory Management**: Remembers past interactions and "redacted" threads.

### 3. Ralph Mode (Autonomous Intelligence)
**Ralph Mode** is the agent's specialized reasoning mode for **self-healing and deep reconstruction**.
- When the agent encounters a "corrupted" document, Ralph Mode triggers a recursive analysis to find missing links.
- It operates with a high confidence threshold (85%+) to ensure declassified information is accurate.

### 4. Muapi.ai (Visual Generation)
The agent is integrated with **Muapi.ai** to generate cinematic evidence of its findings.
- **Image Generation**: Creates 8K visual reconstructions.
- **Cinema Studio**: Simulates professional camera lenses and film stock for high-impact social media reports.

---

## Technical Stack
- **Engine**: Rust (rd-core) for high-performance tool execution.
- **Dashboard**: Next.js 15+ with Solana Wallet integration.
- **Intelligence**: OpenRouter (Gemini 2.5 Flash / Llama 3.3).
- **Storage**: Upstash Redis for global state and gamification.

---

## Deployment & Operation
To deploy the agent, ensure all environment variables in `.env` are configured:
- `MUAPI_API_KEY`
- `OPENROUTER_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `UPSTASH_REDIS_URL`

Run the agent:
```bash
cargo run --bin rd-cli -- start
```
