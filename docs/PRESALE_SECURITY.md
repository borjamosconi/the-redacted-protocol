# Redacted Protocol — Presale Security Guide

This document describes the security posture for the presale and launchpad flow in the current repository state.

## Goals

- Keep private keys out of the repository.
- Use public addresses only in frontend/runtime configuration.
- Fail closed when required environment variables are missing or invalid.
- Make wallet and mint configuration auditable from one place.
- Require manual review before any mainnet deployment.

---

## Current security model

### 1) Public configuration is centralized

The dashboard now reads all public Solana addresses from environment variables via `dashboard/src/lib/rdx-public-config.ts`.

Use these variables in the dashboard environment:

- `NEXT_PUBLIC_RDX_MAIN_AUTHORITY`
- `NEXT_PUBLIC_RDX_TREASURY_WALLET`
- `NEXT_PUBLIC_RDX_AIRDROP_WALLET`
- `NEXT_PUBLIC_RDX_FACTORY_PROGRAM`
- `NEXT_PUBLIC_RDX_TOKEN_MINT`

These values are public addresses only. They are safe to expose in the client bundle, but they should still be reviewed and kept accurate.

### 2) Launch and governance components fail closed

The following components now validate configuration before proceeding:

- `dashboard/src/components/LaunchpadPanel.tsx`
- `dashboard/src/components/TokenLaunchPanel.tsx`
- `dashboard/src/components/GovernancePanel.tsx`

If a required wallet or authority is missing, the UI stops and shows a configuration error instead of using a hardcoded fallback.

### 3) Sensitive values stay out of Git

Private keys, RPC secrets, and other non-public material must never be committed. Use:

- local `.env.local`
- deployment secrets in Vercel or your hosting provider
- Solana keypairs stored outside the repo

---

## Recommended deployment workflow

### Local development

1. Copy `dashboard/.env.local.example` to `dashboard/.env.local`.
2. Fill in only public addresses and non-secret runtime values.
3. Use devnet first.
4. Verify the launchpad, governance panel, and token launch flows render correctly.

### Before mainnet

1. Confirm every public wallet address is correct.
2. Confirm the treasury wallet is a multisig or otherwise protected operational wallet.
3. Confirm the authority wallet is the intended signer.
4. Confirm the token mint address matches the intended deployment.
5. Verify the app behaves correctly when environment variables are missing.
6. Run a dry test on devnet before any irreversible deployment.

---

## Solana security recommendations

### Treasury

- Prefer a multisig for treasury control.
- Do not use a personal hot wallet as the long-term treasury.
- If the treasury receives fees, document how funds are later moved.

### Authority

- The main authority should be explicitly stored as a public address in configuration.
- Access checks should compare against that address only.
- Avoid hardcoded authority strings in UI code.

### Token launch

- Maintain a single source of truth for mint, treasury, and airdrop destinations.
- Require explicit confirmation before deployment actions.
- Keep mint authority revocation part of the launch flow where appropriate.

---

## Frontend hardening applied

The dashboard now includes:

- environment-based address lookup
- explicit invalid-config errors
- removal of hardcoded wallets from the launch components
- safer admin checks for governance access

This reduces the risk of accidental deployment against the wrong wallet or mint.

---

## What is still out of scope

This repository update does not by itself guarantee:

- smart contract correctness
- tokenomics correctness
- multisig enforcement
- on-chain access control
- key custody safety

Those still need contract review, operational review, and a real deployment checklist.

---

## Operational checklist

Before pushing a release:

- [ ] Verify `dashboard/.env.local.example`
- [ ] Verify all public Solana addresses
- [ ] Verify wallet ownership and custody
- [ ] Verify devnet flow end to end
- [ ] Verify mainnet deployment plan
- [ ] Review generated diffs before pushing
- [ ] Keep private keys out of Git history

---

## Bottom line

The safe pattern is now:

- public addresses in environment variables
- private keys never in the repo
- explicit config validation in the UI
- no hardcoded launch wallets in frontend components

If a required address is wrong or missing, the app should fail loudly instead of silently using a fallback.
