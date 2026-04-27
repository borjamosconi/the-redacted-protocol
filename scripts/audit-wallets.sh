#!/usr/bin/env bash
# audit-wallets.sh — fail-fast guard against foreign Solana wallets in code.
#
# This script scans the runtime source tree for base58 addresses that look
# like Solana pubkeys, filters out the user's own wallets and the well-known
# protocol constants, and EXITS NONZERO if anything else is found.
#
# Run before every deploy:
#   bash scripts/audit-wallets.sh
#
# Or as a pre-commit hook:
#   ln -s ../../scripts/audit-wallets.sh .git/hooks/pre-commit
#
# Why: in 2026-04 the dashboard imported a pump.fun template that hardcoded
# the original author's wallets as fee sinks. ~0.239 SOL of user funds
# went to that wallet before we caught it. This script makes that class
# of bug impossible to ship again.

set -euo pipefail
cd "$(dirname "$0")/.."

# ── 1. The ONLY wallets allowed to receive SOL on this project ─────────────
ALLOWED=(
  HjqNchH7bsvgi1gSo9m3wbUasmQT1TaaRbJduDQ5uyPw   # authority (user's main)
  CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8   # treasury
  H4C2GpF5QLFCaY1ZSLsnnA34E1TXG6nYViQLAkNKXMeu   # airdrop
  HZmo7pqLsZ6Z5EeoaRKvTpPdGrpk3mMV9cdALFcFCjjU   # token mint
)

# ── 2. Solana protocol constants — public, cannot leak user funds ──────────
# These are System Programs / standard program IDs / dex protocol addresses.
# They appear in any non-trivial Solana app and must be allowed.
PROTOCOL_CONSTANTS=(
  So11111111111111111111111111111111111111112    # WSOL mint
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr    # Memo program
  1nc1nerator11111111111111111111111111111111    # Solana incinerator (burn)
  675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8   # Raydium AMM v4
  srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX    # Serum DEX (legacy)
  EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj   # OpenBook market
  HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8   # Raydium pool program
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s    # Metaplex token metadata
)

# ── 3. Our own Anchor program IDs — CODE addresses, NOT wallets ─────────────
# Programs cannot hold SOL like wallets. Listed here so the audit doesn't
# false-positive. If new programs are added, append them.
OUR_PROGRAM_IDS=(
  CPLCsPQJrfWQgacJEq1QcbwoMcJocbEhjGVmJLPhs38Z   # rd-token
  HpvmQtmxyPeeYKGvKHqEdcnsYUzAQrdynoCX452s2xLz   # rd-treasury
  BCurve1111111111111111111111111111111111111    # rd-bondingcurve placeholder
  HACK1L8hdDN1wuhV5mEbNYGeMXjhFzvz3HNvDTCdFP2a   # rd-presale
  5CLiUA3yqHNoKAdPeHjeNkipDjjYFPwTpnEFfuR9JxWd   # rd-fragment
  6azG6eVkmNxsPAntuK5LzwX2VXaMqsbdTkCpFyHoSJ22   # rd-archive
  8JJd3isBeCkYtsdwTFFLNRCJJXQbABMRgX67vnVzDvSN   # rd-governance
  B6exebxV6gLVy2J4djeNmULi56uniV9gkogeJfTEo6N9   # rd-staking
  XhodEAbfkn1GJ37pimGBdUJwgM5aXqfDZ9FAMBPxecg    # rd-rewards
  RDtok1111111111111111111111111111111111111     # rd-token placeholder
  RDfrag11111111111111111111111111111111111111   # rd-fragment placeholder
)

ALLOW_RE=$(printf "%s\n" "${ALLOWED[@]}" "${PROTOCOL_CONSTANTS[@]}" "${OUR_PROGRAM_IDS[@]}" | paste -sd "|" -)

# ── 4. Scan runtime code only (skip locks, builds, tests, deps) ────────────
# package-lock.json files contain sha512 hashes that look like base58 but
# aren't Solana addresses — exclude them.
echo "Auditing runtime sources for unknown Solana addresses…"
SUSPECT=$(grep -rEnh "['\"\`][1-9A-HJ-NP-Za-km-z]{32,44}['\"\`]" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.rs" --include="*.toml" --include="*.env*" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=target \
  --exclude-dir=dist \
  --exclude-dir=anchor-build-output \
  --exclude="package-lock.json" \
  --exclude="yarn.lock" \
  dashboard/src/ pumpfun-backend/src/ contracts/scripts/ contracts/tests/ 2>/dev/null \
  | grep -oE "['\"\`][1-9A-HJ-NP-Za-km-z]{32,44}['\"\`]" \
  | tr -d "'\"\`" \
  | sort -u \
  | grep -vE "^($ALLOW_RE)$" || true)

if [[ -z "$SUSPECT" ]]; then
  echo "✅ Clean — only allowed wallets + protocol constants + our program IDs found."
  exit 0
fi

echo ""
echo "🚨 FORBIDDEN ADDRESSES IN RUNTIME CODE 🚨"
echo "$SUSPECT" | while read addr; do
  echo ""
  echo "  $addr"
  grep -rEn "$addr" \
    --include="*.ts" --include="*.tsx" --include="*.js" \
    --include="*.rs" --include="*.toml" --include="*.env*" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=target --exclude-dir=dist \
    --exclude="package-lock.json" --exclude="yarn.lock" \
    dashboard/src/ pumpfun-backend/src/ contracts/scripts/ contracts/tests/ 2>/dev/null \
    | head -3 | sed 's/^/    /'
done
echo ""
echo "Replace with one of:"
printf '  %s\n' "${ALLOWED[@]}"
echo ""
echo "Or — if it's a new protocol constant or our own program — add it to"
echo "scripts/audit-wallets.sh PROTOCOL_CONSTANTS / OUR_PROGRAM_IDS list."
exit 1
