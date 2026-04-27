# Removing the "scam / untrusted" warning from wallets

Phantom, Solflare, Backpack and most Solana wallets show a warning when
a user interacts with `redacted.bond` because the domain has no
**reputation** built up. This is independent of the code — every new
dApp gets the same treatment.

## What the codebase already does

- ✅ Single-instruction buy tx (no multi-recipient drainer pattern)
- ✅ Two-tx launch flow (mint creation + authority lock are separate)
- ✅ Versioned (v0) transactions
- ✅ Solana Memo program instruction on every tx with a human-readable
  description ("Buy 0.1 SOL of $RDX on redacted.bond …")
- ✅ Metaplex Token Metadata embedded in the launch tx (token shows
  with logo + name in Phantom)
- ✅ `/public/manifest.json` self-attestation (standard dApp identity)
- ✅ Audit guard `scripts/audit-wallets.sh` ensures no foreign wallets

## What requires submitting externally (OUT-OF-BAND)

These are reputation systems run by third parties. Each takes days–weeks
and requires you (the dApp owner) to submit the form yourself.

### 1. Blowfish (Phantom, Solflare, Backpack all use it)

Blowfish maintains the central transaction-simulation + dApp-trust API
that most Solana wallets query before showing a warning.

**Submit redacted.bond:**
- Form: https://blowfish.xyz/contact
- Pick "Report a dApp"
- Provide:
  - URL: `https://redacted.bond`
  - Twitter: `https://x.com/TheRedacted_Sol`
  - GitHub: `https://github.com/whalesconspiracy-33/the-redacted-protocol`
  - Brief: "Pump.fun-style launchpad for tokens of redacted /
    censored documents. RDX SPL mint:
    `Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj` — supply fixed,
    mint authority null, freeze authority null."
- Expected timeline: 3–10 business days

### 2. Jupiter Strict Token List (validates the RDX SPL mint)

Wallets cross-reference the Jupiter Strict list. If RDX is on it, the
"unknown token" warning disappears in every wallet.

- Form: https://catdetlist.jup.ag/
- Submit:
  - Mint: `Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj`
  - Name: The Redacted Protocol
  - Symbol: RDX
  - Decimals: 9
  - Logo URL: `https://api.redacted.bond/api/tokens/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj/metadata.json`
  - Website: https://redacted.bond
  - Twitter: https://x.com/TheRedacted_Sol
- Requires: a public Twitter announcement linking the token, some
  on-chain trade volume (so they can verify it's not abandoned)

### 3. Solana Foundation Validators / Birdeye

- Birdeye verification: https://docs.birdeye.so/docs/token-verification
- Adds a checkmark on the token's price page; users feel safer

### 4. Build a Twitter footprint

Phantom's Blowfish heuristics score domains higher when:
- The domain's Twitter (`@TheRedacted_Sol`) has > 1000 followers
- It's referenced from other established crypto Twitters
- The domain has SSL (✅ we have Let's Encrypt) + DNSSEC
- WHOIS isn't behind a privacy proxy

## What the user typically sees while reputation is being built

| Warning | Cause | Fix |
|---|---|---|
| "This dApp is not on our trusted list" | Blowfish hasn't seen redacted.bond | Submit (1) |
| "Unknown token, may be a scam" | RDX not on Jupiter Strict | Submit (2) |
| "First time interacting with this wallet" | Treasury has no incoming txs | Resolves naturally as buys land |
| "Multiple instructions in this tx" | Solved — we use 1-2 instr/tx + memo | ✅ already fixed |

## Worth knowing

- Solflare and Backpack tend to be **less aggressive** than Phantom.
  If your users are seeing scam warnings on Phantom specifically,
  recommending Solflare temporarily is a valid workaround.
- The warning ALWAYS allows the user to "Proceed anyway". It's not a
  block, just a confirmation. Communicate this in your marketing.
- After ~50 successful trades and ~2 weeks of consistent on-chain
  activity, the warnings often disappear automatically as Blowfish
  re-scores the domain.

## TL;DR for fastest improvement

1. Submit to Blowfish (3–10 days) → removes most "untrusted dApp" flags
2. Submit RDX to Jupiter Strict (5–14 days) → removes "unknown token"
3. Tweet from `@TheRedacted_Sol` with link to the dApp + a few buys
4. After 2 weeks: re-test in Phantom, warning should be gone or much milder
