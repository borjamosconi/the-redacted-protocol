#!/usr/bin/env bash
# Anchor build + deploy pipeline for THE REDACTED PROTOCOL.
#
# Steps:
#   1. anchor build           — compile all 8 programs
#   2. anchor deploy          — push to the configured cluster (Anchor.toml)
#   3. propagate program IDs  — copy new IDs into backend .env and dashboard .env.local
#   4. copy IDLs              — contracts/target/idl/rd_bondingcurve.json → backend + dashboard
#
# Usage:
#   ./deploy/deploy.sh <cluster>
# where <cluster> is one of: devnet | mainnet-beta | localnet
#
# Prereqs: solana CLI, anchor CLI, a funded wallet at ~/.config/solana/id.json.

set -euo pipefail

CLUSTER="${1:-devnet}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS="$ROOT/contracts"
BACKEND="$ROOT/pumpfun-backend"
DASHBOARD="$ROOT/dashboard"

echo "→ building contracts"
cd "$CONTRACTS"
anchor build

echo "→ deploying to $CLUSTER"
anchor deploy --provider.cluster "$CLUSTER"

# ── Extract new program IDs ───────────────────────────────────────────────
declare -A IDS
for prog in rd_bondingcurve rd_token rd_treasury rd_presale rd_staking rd_rewards rd_governance rd_archive rd_fragment; do
  keypair="$CONTRACTS/target/deploy/${prog}-keypair.json"
  if [[ -f "$keypair" ]]; then
    id=$(solana-keygen pubkey "$keypair")
    IDS[$prog]=$id
    echo "  $prog = $id"
  fi
done

# ── Propagate to backend .env ─────────────────────────────────────────────
if [[ -f "$BACKEND/.env" ]]; then
  echo "→ updating $BACKEND/.env"
  sed -i.bak -E \
    -e "s|^RD_BONDINGCURVE_PROGRAM_ID=.*|RD_BONDINGCURVE_PROGRAM_ID=${IDS[rd_bondingcurve]:-}|" \
    -e "s|^RD_TOKEN_PROGRAM_ID=.*|RD_TOKEN_PROGRAM_ID=${IDS[rd_token]:-}|" \
    -e "s|^RD_TREASURY_PROGRAM_ID=.*|RD_TREASURY_PROGRAM_ID=${IDS[rd_treasury]:-}|" \
    -e "s|^RD_PRESALE_PROGRAM_ID=.*|RD_PRESALE_PROGRAM_ID=${IDS[rd_presale]:-}|" \
    "$BACKEND/.env"
  rm -f "$BACKEND/.env.bak"
fi

# ── Propagate to dashboard .env.local ─────────────────────────────────────
if [[ -f "$DASHBOARD/.env.local" ]]; then
  echo "→ updating $DASHBOARD/.env.local"
  sed -i.bak -E \
    -e "s|^NEXT_PUBLIC_RD_BONDINGCURVE_PROGRAM_ID=.*|NEXT_PUBLIC_RD_BONDINGCURVE_PROGRAM_ID=${IDS[rd_bondingcurve]:-}|" \
    -e "s|^NEXT_PUBLIC_RD_TOKEN_PROGRAM_ID=.*|NEXT_PUBLIC_RD_TOKEN_PROGRAM_ID=${IDS[rd_token]:-}|" \
    -e "s|^NEXT_PUBLIC_RD_TREASURY_PROGRAM_ID=.*|NEXT_PUBLIC_RD_TREASURY_PROGRAM_ID=${IDS[rd_treasury]:-}|" \
    "$DASHBOARD/.env.local"
  rm -f "$DASHBOARD/.env.local.bak"
fi

# ── Copy IDLs where the clients can consume them ─────────────────────────
IDL_SRC="$CONTRACTS/target/idl"
if [[ -f "$IDL_SRC/rd_bondingcurve.json" ]]; then
  echo "→ copying IDL to backend + dashboard"
  mkdir -p "$BACKEND/src/program/idls"
  mkdir -p "$DASHBOARD/src/lib/rd-bondingcurve/idls"
  cp "$IDL_SRC/rd_bondingcurve.json" "$BACKEND/src/program/idls/"
  cp "$IDL_SRC/rd_bondingcurve.json" "$DASHBOARD/src/lib/rd-bondingcurve/idls/"
fi

echo "✓ deploy complete"
