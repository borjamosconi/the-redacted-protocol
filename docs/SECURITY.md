# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (current) | ✅ Yes |

## Reporting a Vulnerability

**Do NOT open a public issue** for security vulnerabilities.

Instead:

1. Email the maintainers at the address associated with the repository
2. Include a description of the vulnerability
3. Include steps to reproduce
4. Include potential impact

We will respond within 48 hours and work with you to resolve the issue.

## Security Model

### Data Privacy

- **Source URLs are never stored in plaintext** — only SHA-256 hashes
- **API keys are read from environment variables only** — never committed to disk
- **Chain-of-thought reasoning is never logged or stored** — only results and confidence scores

### Smart Contracts

- All accounts use **PDA derivation with strict seeds** — no arbitrary account creation
- **Signer validation** on all state-modifying instructions
- **Input validation** with `require!` macros (Anchor)
- **No re-entrancy** — Solana's execution model prevents this by design

### Hook System

- Hooks run as **separate processes** — no direct memory access
- Hook output is **sanitized before inclusion** in tool results
- Hook exit code `2` (deny) **prevents tool execution entirely** — no race conditions

### Permission Model

- Three-tier system: **Observer < Reconstructor < Declassifier**
- Context-based deny lists provide **runtime restrictions** beyond the level system
- Tool execution **checks permission before every call** — not just at session start

---

## Clean-Room Implementation

This project is a 100% original implementation. No code was copied from any proprietary source. All architecture decisions were made independently based on publicly available concepts and patterns.
