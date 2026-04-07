# 🔴 Redacted Protocol Agent

> **Autonomous, privacy-preserving, zero-knowledge AI agent for document declassification on Solana.**
>
> 100% Rust · Clean-room implementation · MIT Licensed · **100% Free to Run**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg)](https://www.rust-lang.org)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF.svg)](https://solana.com)
[![Zero Cost](https://img.shields.io/badge/Run%20Cost-%240-green.svg)](#free-setup)

---

## Table of Contents

- [Overview](#overview)
- [100% Free Setup](#free-setup)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Core Agent Loop](#core-agent-loop)
- [CLI Commands](#cli-commands)
- [Permission Model](#permission-model)
- [Hook System](#hook-system)
- [Solana Contracts](#solana-contracts)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Development](#development)
- [License](#license)

---

## Overview

**Redacted Agent** is a fully Rust-native autonomous AI system that:

1. **Detects** redacted/censored content (███, black bars, obscured text)
2. **Reconstructs** hidden information using contextual LLM inference
3. **Verifies** reconstruction accuracy via multi-signal confidence scoring
4. **Anchors** declassified fragments on Solana blockchain
5. **Stores** permanently on Arweave
6. **Publishes** in the signature Redacted Protocol aesthetic

### Why This Matters

Censorship is increasing globally. Documents are being redacted, truths hidden behind black bars. Redacted Agent flips the script: **an autonomous AI that finds, reconstructs, and permanently preserves censored information** in a verifiable, decentralized manner.

### Key Features

- 🧠 **ReAct Agent Loop** — Reason + Act cycle with tool calling, permission checks, and hook execution
- 🔌 **Multi-Provider LLM** — Anthropic, OpenAI, xAI Grok, DashScope Qwen, OpenRouter — swap anytime
- 🔒 **Three-Tier Permissions** — Observer → Reconstructor → Declassifier, with context-based deny lists
- 🔗 **Hook System** — Pre/Post tool execution hooks with exit code protocol (0=allow, 2=deny)
- 💾 **Session Persistence** — Versioned JSON sessions with atomic writes and crash recovery
- ⛓️ **Solana Smart Contracts** — Fragment anchoring + Archivo 0 registry via Anchor
- 💰 **Zero Cost** — Runs 100% free with OpenRouter free tier models

---

## Free Setup

Run the agent at **zero cost** using OpenRouter's free model tier:

### Step 1: Get a Free OpenRouter API Key

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign up (free, no credit card needed)
3. Go to Keys → Create API Key
4. Copy your key

### Step 2: Set Environment Variables

```bash
# Linux/macOS
export OPENROUTER_API_KEY="sk-or-v1-xxxx"
export OPENROUTER_MODEL="google/gemini-2.0-flash-exp:free"

# Windows (CMD)
set OPENROUTER_API_KEY=sk-or-v1-xxxx
set OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free

# Windows (PowerShell)
$env:OPENROUTER_API_KEY="sk-or-v1-xxxx"
$env:OPENROUTER_MODEL="google/gemini-2.0-flash-exp:free"
```

### Free Models Available on OpenRouter

| Model | Provider | Cost |
|-------|----------|------|
| `google/gemini-2.0-flash-exp:free` | Google | **$0** |
| `openai/gpt-oss-20b:free` | OpenAI | **$0** |
| `meta-llama/llama-3-8b-instruct:free` | Meta | **$0** |
| `microsoft/phi-4-mini-instruct:free` | Microsoft | **$0** |
| `qwen/qwen2.5-vl-72b-instruct:free` | Qwen | **$0** |
| `google/gemini-2.5-flash-preview-tts:free` | Google | **$0** |

### Step 3: Run

```bash
cargo build --release
cargo run --release -- -p "Process this: The ████ was moved to ███████"
```

**Total cost: $0.** No credit card. No trial limits. No hidden fees.

---

## Quick Start

### Prerequisites

```bash
rustc --version   # 1.75+
cargo --version
```

### Build

```bash
git clone https://github.com/AKIRA-33/the_redacted_protocol.git
cd the_redacted_protocol
cargo build --release
```

### Run (One-Shot)

```bash
export OPENROUTER_API_KEY="sk-or-v1-xxxx"
cargo run --release -- -p "Analyze this redacted document: The ████ was moved to ███████"
```

### Run (Interactive REPL)

```bash
cargo run --release

# Inside REPL:
▸ /help          # Show commands
▸ /status        # Session status
▸ /model gemini  # Change model
▸ /permission declassifier  # Full access
▸ Process this fragment: ███ CLASSIFIED ███
▸ /cost          # Token usage
▸ /clear         # Clear session
▸ Ctrl+C         # Exit
```

### Docker

```bash
# Start with free config
docker-compose --profile free up -d
```

---

## Architecture

### Crate Layout

```
the_redacted_protocol/
├── crates/
│   ├── rd-types/          # Shared type definitions
│   │   ├── fragment       # Fragment, SourceMetadata, DeclassifiedResult
│   │   ├── block          # ContentBlock (Text, ToolUse, ToolResult)
│   │   ├── permission     # PermissionLevel, PermissionContext
│   │   ├── confidence     # ConfidenceScore (multi-signal weighted)
│   │   ├── event          # StreamEvent, TokenUsage
│   │   └── provider       # ProviderKind, ModelRef
│   ├── rd-session/        # Session persistence & recovery
│   │   ├── session        # Versioned JSON sessions
│   │   └── store          # Atomic writes (temp→rename)
│   ├── rd-providers/      # Multi-provider LLM abstraction
│   │   ├── trait_def      # Provider trait + Box<dyn Provider> impl
│   │   ├── anthropic      # Claude (Messages API)
│   │   ├── openai_compat  # OpenAI, xAI Grok, DashScope, OpenRouter
│   │   └── router         # ProviderRouter with auto-detection
│   ├── rd-tools/          # Tool registry
│   │   ├── spec           # ToolSpec with JSON schema
│   │   ├── registry       # ToolRegistry + ToolHandler trait
│   │   └── builtins       # read_file, write_file, grep, shell, etc.
│   ├── rd-hooks/          # Hook system
│   │   ├── hook_types     # HookPhase, HookResult, exit codes
│   │   └── runner         # Pre/Post tool execution hooks
│   ├── rd-config/         # Multi-layer configuration
│   │   ├── settings       # RuntimeSettings, RawConfig, deep merge
│   │   └── loader         # Config discovery (user → project → local)
│   ├── rd-core/           # Core ReAct agent loop
│   │   ├── orchestrator   # Main loop: permission → hook → execute
│   │   ├── prompt_builder # Dynamic system prompt assembly
│   │   ├── turn_summary   # Turn results, stop causes
│   │   └── permission_checker # Level + context enforcement
│   └── rd-cli/            # CLI binary (`rd`)
│       ├── main           # Arg parsing, one-shot mode
│       ├── repl           # Interactive REPL loop
│       ├── commands       # Slash command handler (11 commands)
│       └── display        # Terminal formatting utilities
├── contracts/
│   ├── programs/
│   │   ├── rd-fragment/   # Solana: fragment anchoring (PDA)
│   │   └── rd-archive/    # Solana: Archivo 0 registry
│   └── Anchor.toml
└── docs/
    ├── FREE_SETUP.md      # 100% free configuration guide
    ├── ARCHITECTURE.md    # Detailed architecture diagrams
    └── CONTRIBUTING.md    # How to contribute
```

---

## Core Agent Loop

The orchestrator implements the **ReAct pattern** (Reason + Act):

```
User Input
    ↓
┌─────────────────────────────────────────────────┐
│ LOOP (max_iterations)                           │
│                                                 │
│  1. Build LLM Request                           │
│     (system prompt + session messages + tools)  │
│                                                 │
│  2. Call Provider → Response                    │
│                                                 │
│  3. Parse Response                              │
│     ├─ Text blocks → accumulate                  │
│     └─ Tool calls → for each:                   │
│        │                                         │
│        ├─ 3a. Permission Check                  │
│        │   (level >= required, not in deny list)│
│        │   └─ DENIED → skip to next tool        │
│        │                                         │
│        ├─ 3b. PreToolUse Hooks                  │
│        │   (exit 0=allow, 2=deny, other=warn)   │
│        │   └─ DENIED → skip to next tool        │
│        │                                         │
│        ├─ 3c. Execute Tool                      │
│        │   (ToolHandler trait impl)              │
│        │                                         │
│        └─ 3d. PostToolUse Hooks                 │
│            (append warnings to result)           │
│                                                 │
│  4. No tool calls? → DONE                       │
│     Hit max iterations? → STOP with summary     │
│                                                 │
│  5. Feed results back to LLM → repeat           │
│                                                 │
└─────────────────────────────────────────────────┘
    ↓
Save Session (atomic write)
    ↓
Return TurnSummary
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/status` | Show session ID, model, message count, estimated tokens |
| `/model [name]` | Show or change the LLM model |
| `/permission [level]` | Show or change permission (observer/reconstructor/declassifier) |
| `/clear` | Clear conversation history (system prompts preserved) |
| `/cost` | Show cumulative token usage (input/output/total) |
| `/compact` | Compact session — keep system + last 20 messages |
| `/config` | Show loaded configuration from all config files |
| `/version` | Show version number |
| `/init` | Initialize RD.md instruction file |
| `/export [id]` | Export session data |

### Flags

| Flag | Description |
|------|-------------|
| `-p "text"` | One-shot prompt (non-interactive) |
| `--resume` | Resume the latest session |
| `--resume-session <id>` | Resume a specific session |
| `-m <model>` | Set model (overrides config) |
| `-P <level>` | Set permission level |
| `-C <dir>` | Set working directory |
| `--json` | Enable JSON output mode |

---

## Permission Model

Three permission levels control which tools can execute:

| Level | Value | Allowed Operations |
|-------|-------|-------------------|
| **Observer** | 0 | Read files, search, inspect fragments — no writes |
| **Reconstructor** | 1 | Observer + write files, reconstruct content |
| **Declassifier** | 2 | All above + shell execution, network calls, blockchain TX, publishing |

### Permission Enforcement

```
Tool Call → PermissionChecker.authorize(tool_name, registry)
    ├─ Check context deny lists (names + prefixes)
    ├─ Look up tool's required_permission
    ├─ Current level >= required? → ALLOW
    └─ Otherwise → DENY with reason
```

### Context Deny Lists

Additional runtime restrictions beyond the level system:

```rust
let ctx = PermissionContext::new()
    .deny_name("shell")
    .deny_prefix("destructive_");
```

---

## Hook System

Hooks run as **external processes** before/after tool execution.

### Exit Code Protocol

| Exit Code | Meaning | Behavior |
|-----------|---------|----------|
| `0` | Allow | Tool proceeds normally. Stdout captured as feedback. |
| `2` | Deny | **Tool blocked.** Execution never happens. |
| Other | Warn | Tool proceeds with warning appended to result. |

### Environment Variables Injected

| Variable | Description |
|----------|-------------|
| `RD_HOOK_PHASE` | `pre_tool_use` or `post_tool_use` |
| `RD_HOOK_TOOL_NAME` | Name of the tool being executed |
| `RD_HOOK_TOOL_INPUT` | JSON input to the tool (pre-phase only) |
| `RD_HOOK_TOOL_OUTPUT` | Output from the tool (post-phase only) |
| `RD_HOOK_TOOL_IS_ERROR` | `true` or `false` (post-phase only) |

### Example: Audit Hook

```bash
#!/bin/bash
# hooks/audit.sh — logs all tool executions

echo "[$(date)] Tool: $RD_HOOK_TOOL_NAME, Phase: $RD_HOOK_PHASE" >> /var/log/rd-audit.log

# Block shell commands in production
if [ "$RD_HOOK_PHASE" = "pre_tool_use" ] && [ "$RD_HOOK_TOOL_NAME" = "shell" ]; then
    echo "Shell execution blocked by policy"
    exit 2
fi

exit 0
```

### Configuration

```json
{
  "pre_tool_hooks": ["./hooks/audit.sh"],
  "post_tool_hooks": ["./hooks/log-result.sh"]
}
```

---

## Solana Contracts

### rd-fragment

Anchors declassified fragments on Solana using PDA-derived accounts.

**Instructions:**

| Instruction | Description |
|-------------|-------------|
| `submit_fragment` | Create a fragment account with content hash, reconstruction, confidence, Arweave TX |
| `verify_fragment` | Mark fragment as ZK-verified with proof hash |

**PDA Seeds:**
```rust
seeds: [b"fragment", content_hash.as_ref()]
bump: fragment_bump
```

### rd-archive

Manages the Archivo 0 permanent collection registry.

**Instructions:**

| Instruction | Description |
|-------------|-------------|
| `register_entry` | Register a fragment in the Archivo 0 sequence |

**PDA Seeds:**
```rust
seeds: [b"archive", sequence_number.to_le_bytes().as_ref()]
bump: archive_bump
```

### Build & Deploy

```bash
cd contracts
anchor build
anchor deploy --provider.cluster devnet
```

---

## Configuration

### Config File Discovery

Files are loaded in priority order (later overrides earlier):

1. `~/.rd-agent/config.json` — User config
2. `~/.rd-agent/settings.json` — User settings
3. `<cwd>/.rd-agent.json` — Project config
4. `<cwd>/settings.json` — Project settings
5. `<cwd>/settings.local.json` — Local overrides (gitignored)

### Example settings.json

```json
{
  "model": "sonnet",
  "permission_mode": "reconstructor",
  "max_iterations": 50,
  "temperature": 0.3,
  "confidence_threshold": 0.85,
  "max_fragment_retries": 3,
  "cooldown_seconds": 300,
  "max_concurrent_jobs": 5,
  "solana_rpc_url": "https://api.devnet.solana.com",
  "arweave_gateway": "https://arweave.net",
  "pre_tool_hooks": [],
  "post_tool_hooks": []
}
```

---

## Tokenomics ($RDX)

| Allocation | Percentage | Amount | Vesting |
|-----------|-----------|--------|---------|
| Community Airdrop | 40% | 400M RDX | Immediate |
| Liquidity Pool | 20% | 200M RDX | Immediate + LP Burn |
| Staking Rewards | 15% | 150M RDX | Linear 24 months |
| Team | 15% | 150M RDX | 6mo cliff, 18mo vest |
| Treasury/DAO | 10% | 100M RDX | As voted |

### Airdrop Details
- **1,000 RDX** guaranteed for every Telegram bot user
- **+100 RDX** per document submitted
- **+50 RDX** per fragment verified
- **+50 RDX** per referral
- Register at: **https://redacted-protocol.vercel.app** (or self-host)

### Utility
- Pay for document processing (0.1 RDX per document)
- Stake to earn 70% of protocol fees
- Vote on governance proposals
- Mint rare fragments as Archivo 0 NFTs
- Access premium search API

---

## Airdrop Registration Site

A dedicated registration site with full Redacted Protocol aesthetic:

```bash
cd airdrop-site
npm install
npm run dev
# Open http://localhost:3001
```

Features:
- Dark dystopian UI with glitch animations
- Floating redacted documents
- Red censor bars and VHS effects
- Wallet registration with Telegram ID verification
- Real-time registration counter
- Eligibility checker
- Fully static — deploy to Vercel, Netlify, or any static host

---

## Deployment

### Local Development

```bash
cargo run --release
```

### VPS / Cloud Server

```bash
# On your server
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
git clone https://github.com/AKIRA-33/the_redacted_protocol.git
cd the_redacted_protocol
cargo build --release

# Set env vars in .env or systemd service
export OPENROUTER_API_KEY=sk-or-v1-xxxx
export OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free

# Run
./target/release/rd
```

### Systemd Service

```ini
[Unit]
Description=Redacted Protocol Agent
After=network-online.target

[Service]
Type=simple
User=rd-agent
WorkingDirectory=/opt/rd-agent
ExecStart=/opt/rd-agent/target/release/rd
Environment=OPENROUTER_API_KEY=sk-or-v1-xxxx
Environment=OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Development

### Build

```bash
cargo build           # Debug build
cargo build --release # Release build (optimized)
```

### Test

```bash
cargo test --workspace       # Run all tests
cargo test --workspace -- --nocapture  # With output
```

### Lint

```bash
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --workspace -- --check
```

### Project Structure

| Crate | Lines | Purpose |
|-------|-------|---------|
| rd-types | ~300 | Core domain types |
| rd-session | ~120 | Session persistence |
| rd-providers | ~350 | LLM provider abstraction |
| rd-tools | ~250 | Tool registry & builtins |
| rd-hooks | ~200 | Hook execution system |
| rd-config | ~180 | Multi-layer configuration |
| rd-core | ~300 | ReAct agent loop |
| rd-cli | ~250 | CLI binary |
| **Total** | **~1,950** | |

---

## License

**MIT License** — see [LICENSE](LICENSE)

This is a 100% clean-room implementation. No code was copied from any proprietary source. All types, names, and structures are original. The design patterns (ReAct loop, tool registry, hooks) are universal computer science concepts implemented independently.

---

**"The truth cannot be redacted. The file is breathing."**
