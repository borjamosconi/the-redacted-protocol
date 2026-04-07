# 🔴 Redacted Agent

> **Autonomous, privacy-preserving, zero-knowledge AI agent for document declassification on Solana.**
>
> 100% Rust · Clean-room implementation · MIT Licensed

---

## Quick Start

```bash
# Build
cargo build --release

# Run one-shot (needs an LLM API key)
export ANTHROPIC_API_KEY=sk-ant-...
cargo run --release -- -p "Process: The ████ was moved to ███████"

# Interactive REPL
cargo run --release
```

## Architecture

| Crate | Purpose |
|-------|---------|
| `rd-types` | Fragment, ContentBlock, PermissionLevel, ConfidenceScore |
| `rd-session` | Versioned JSON sessions, atomic writes, recovery |
| `rd-providers` | Anthropic, OpenAI, xAI Grok, DashScope, OpenRouter |
| `rd-tools` | ToolSpec registry, JSON schema, permission enforcement |
| `rd-hooks` | PreToolUse / PostToolUse hooks (exit 0=allow, 2=deny) |
| `rd-config` | Multi-layer config (user → project → local) |
| `rd-core` | ReAct agent loop: permission → hook → execute → result |
| `rd-cli` | Binary `rd`: REPL, one-shot, slash commands |

## Solana Contracts

- **rd-fragment** — `submit_fragment()` + `verify_fragment()`
- **rd-archive** — `register_entry()` for Archivo 0

## License

MIT — see [LICENSE](LICENSE)

---

**"The truth cannot be redacted. The file is breathing."**
