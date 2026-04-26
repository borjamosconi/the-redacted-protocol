# THE REDACTED PROTOCOL — Presale Deploy Runbook

End-to-end procedure to launch the presale on **Solana mainnet-beta** safely.
Aim: zero ambiguity, every step copy-pasteable, every safety check documented.

> **Read everything before running anything.** A mistake at deploy time costs
> real SOL and may lock user funds. The smart contracts already include
> emergency pause + 7-day-timelock recovery, but prevention beats remediation.

---

## Pre-flight checklist

- [ ] `cd contracts && cargo check --workspace` exits 0
- [ ] `cd dashboard && npm run build` exits 0
- [ ] Wallet with **≥10 SOL** for program-deploy fees and rent
- [ ] Mainnet RPC endpoint that supports `getProgramAccounts` (Helius, Triton, QuickNode — **not** the public RPC)
- [ ] `solana-cli ≥ 1.18`, `anchor-cli ≥ 0.30.1`, `node ≥ 20`
- [ ] GitHub `master` is at the commit you intend to deploy (`git rev-parse origin/master`)
- [ ] You have access to the VPS (`ssh root@69.62.116.165`) and PM2 is running `rdx-dashboard` + `rdx-backend`
- [ ] Mongo container `rdx-mongo` is up on the VPS (`docker ps | grep rdx-mongo`)
- [ ] DNS for `app.redacted.bond` and `api.redacted.bond` resolves to the VPS

---

## Step 1 — Generate (or confirm) program keypairs

Each program ships with a placeholder `declare_id!` and a deploy keypair under
`contracts/target/deploy/<program>-keypair.json`. The deploy keypair's pubkey
**must equal** the `declare_id!` literal, otherwise the program-side and
client-side IDs disagree and every CPI fails.

```bash
cd contracts

# If you have NOT generated keypairs yet:
for p in rd-bondingcurve rd-presale rd-token rd-treasury rd-staking \
         rd-rewards rd-governance rd-fragment rd-archive ; do
  out="target/deploy/${p//-/_}-keypair.json"
  mkdir -p target/deploy
  [[ -f "$out" ]] || solana-keygen new --no-bip39-passphrase -o "$out"
done

# Print pubkeys so you can paste them into declare_id!:
for p in rd-bondingcurve rd-presale rd-token rd-treasury rd-staking \
         rd-rewards rd-governance rd-fragment rd-archive ; do
  echo "$p $(solana-keygen pubkey target/deploy/${p//-/_}-keypair.json)"
done
```

Update `programs/<program>/src/lib.rs` `declare_id!("...")` and
`Anchor.toml` `[programs.mainnet]` block with the printed pubkeys.

> **Never commit** these keypair JSON files. `.gitignore` already blocks
> `wallet.json`, `id.json`, and `gen_keys.js`. If you generated new keypairs,
> double-check `git status` is clean of them before pushing.

---

## Step 2 — Build & verify

```bash
cd contracts
anchor build
```

This regenerates `target/idl/*.json`. Sync them to the consumers:

```bash
cp target/idl/rd_bondingcurve.json ../dashboard/src/lib/rd-bondingcurve/idl.json
cp target/idl/rd_presale.json      ../dashboard/src/lib/rd-presale/idl.json   # create dir if needed
cp target/idl/rd_bondingcurve.json ../pumpfun-backend/src/program/idl/rd_bondingcurve.json
cp target/idl/rd_presale.json      ../pumpfun-backend/src/program/idl/rd_presale.json
```

The `dashboard/src/lib/rd-bondingcurve/idl.ts` and
`pumpfun-backend/src/program/idl.ts` files currently contain hand-written
stubs sufficient to subscribe to events — replace them with imports from the
generated JSON for full instruction coverage:

```ts
// dashboard/src/lib/rd-bondingcurve/idl.ts
export { default as IDL } from './idl.json'
```

---

## Step 3 — Deploy programs

```bash
# Set cluster + wallet:
solana config set --url https://api.mainnet-beta.solana.com  # or your private RPC
solana config set --keypair ~/.config/solana/deployer.json
solana balance   # should show ≥10 SOL

# Deploy ALL programs in one go:
anchor deploy --provider.cluster mainnet-beta

# OR deploy one-by-one (safer — you can stop if one fails):
for p in rd_token rd_treasury rd_bondingcurve rd_presale rd_staking \
         rd_rewards rd_governance rd_fragment rd_archive ; do
  anchor deploy --program-name "$p" --provider.cluster mainnet-beta
  echo "deployed $p"
done
```

After each deploy, capture the program ID:

```bash
solana program show --programs --output json | \
  jq -r '.programs[] | "\(.programId) \(.lastDeploySlot)"' | head
```

---

## Step 4 — Wire program IDs into runtime config

Update **on the VPS** (`ssh root@69.62.116.165`):

```bash
cd /opt/redacted-new

# Backend — paste the deployed pubkeys:
nano pumpfun-backend/.env
# Set:
#   RD_BONDINGCURVE_PROGRAM_ID=<pubkey from anchor deploy>
#   RD_PRESALE_PROGRAM_ID=<pubkey>
#   RD_TOKEN_PROGRAM_ID=<pubkey>
#   RD_TREASURY_PROGRAM_ID=<pubkey>
#   ADMIN_PRIVATE_KEY=<base58 of the deploy authority — keep this OFF git>
#   SOLANA_RPC=<your private mainnet RPC URL>
#   MIGRATION_AUTHORITY_PUBKEY=<authority that will own LP-lock at graduation>
#   TREASURY_PUBKEY=<treasury PDA or authority — see treasury init below>

# Dashboard:
nano dashboard/.env.local
# Set:
#   NEXT_PUBLIC_RD_BONDINGCURVE_PROGRAM_ID=<same as backend>
#   NEXT_PUBLIC_RD_PRESALE_PROGRAM_ID=<same as backend>
#   NEXT_PUBLIC_RPC=<same RPC>
#   NEXT_PUBLIC_BACKEND_URL=https://api.redacted.bond
```

Restart:

```bash
pm2 restart rdx-backend rdx-dashboard --update-env
pm2 logs --lines 30   # watch for "rd-bondingcurve log listener attached"
```

---

## Step 5 — Initialize on-chain state

Run once, in this order. Each is a single TX from the deploy authority.

```bash
cd contracts

# 1) rd-bondingcurve global config (sets emergency_admin, fee sinks, etc.)
ts-node scripts/init-bondingcurve.ts \
  --rpc "$SOLANA_RPC" \
  --keypair ~/.config/solana/deployer.json \
  --treasury <TREASURY_PUBKEY> \
  --emergency-admin <ADMIN_PUBKEY>

# 2) rd-treasury: init + whitelist the dev/team multisig as allowed recipient
ts-node scripts/init-treasury.ts --authority <AUTHORITY_PUBKEY>
ts-node scripts/treasury-add-recipient.ts --recipient <TEAM_MULTISIG>

# 3) rd-fragment: init config + add verifier(s)
ts-node scripts/init-fragment-config.ts --admin <ADMIN_PUBKEY>
ts-node scripts/fragment-add-verifier.ts --verifier <VERIFIER_PUBKEY>

# 4) rd-presale: init with the soft cap and rate
ts-node scripts/init-presale.ts \
  --rdx-mint <RDX_TOKEN_MINT_PUBKEY> \
  --rdx-per-sol 1000000000000 \
  --soft-cap-sol 100   # 100 SOL minimum to launch
```

> If those scripts do not exist yet, the equivalent `program.methods.X().rpc()`
> calls work directly from a Node REPL with the IDL imported. Each instruction
> is a single account-list build — see `contracts/tests/rd-presale.ts` for the
> exact shape.

---

## Step 6 — Smoke test on devnet first (recommended)

Before mainnet, run the same flow on devnet:

```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 5
anchor deploy --provider.cluster devnet
# repeat steps 4 and 5 with the devnet RPC
# then make a 0.1 SOL test buy via the dashboard pointed at devnet
```

Verify in `https://api.redacted.bond/api/tokens/<MINT>/trades` that the trade
appears within 5 seconds (the log listener subscribes to `TradeEvent`).

---

## Step 7 — Mainnet smoke test

After mainnet deploy + init:

1. Open `https://app.redacted.bond/terminal/<PRESALE_MINT>`
2. Connect wallet (Phantom)
3. Buy 0.1 SOL of presale tokens
4. Verify in MongoDB: `docker exec rdx-mongo mongosh --quiet --eval 'use redacted; db.trades.findOne({}, {sort:{ts:-1}})'`
5. Verify on-chain: `solana account <BUYER_STATS_PDA> --output json` shows the contribution
6. Verify dashboard chart updates within 5 seconds

---

## Emergency procedures

### Pause the bonding curve

```bash
ts-node scripts/emergency-pause.ts --paused true
```

This sets `paused = true` and stamps `paused_at = now`. All `buy` / `sell` /
`graduate` instructions reject until unpaused or until 7 days elapse.

### Recover funds (after 7-day timelock)

If the curve is paused for ≥7 days and an issue cannot be resolved by code:

```bash
ts-node scripts/emergency-withdraw.ts
```

Each user calls `emergency_withdraw` themselves — they burn their tokens
pro-rata and receive their share of the SOL vault. Admin cannot drain
unilaterally.

### Refund a failed presale

If presale ends and `total_sol_raised < soft_cap`:

```bash
# Each buyer (not admin) calls:
ts-node scripts/claim-refund.ts --buyer <BUYER_KEYPAIR>
```

The contract enforces:
- `now > end_time`
- `!is_launched`
- `total_sol_raised < soft_cap`
- `!buyer_stats.refunded` (single-shot)

---

## What is NOT done in this runbook (intentional)

- **No actual `anchor deploy` execution.** Mainnet costs real SOL — the user
  runs that step themselves after reading this entire document.
- **No external audit.** Strongly recommended before mainnet with real money.
  Suggested firms: OtterSec, Ackee Blockchain, Halborn. Budget €15k–30k and
  4–6 weeks lead time.
- **No multisig on the deploy authority.** Today the upgrade authority is a
  single keypair. For production: transfer it to a Squads V4 multisig
  (`solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <MULTISIG_PUBKEY>`)
  before announcing the launch publicly.
- **Raydium AMM CPI** is partially on-chain (LP lock is enforced) but the
  pool creation itself requires an off-chain helper. See
  `programs/rd-bondingcurve/src/lib.rs` `graduate_step2_lock_lp` for the
  on-chain side; the OpenBook market + Raydium `initialize2` call must be
  scripted by the migration authority.

---

## Rollback / abort

If anything goes wrong before public announcement:

1. `pm2 stop rdx-dashboard` — pulls the public site offline.
2. `solana program set-upgrade-authority <ID> --new-upgrade-authority <NEW>` —
   transfer to a cold wallet so a compromised hot key cannot brick programs.
3. `solana program close <ID> --bypass-warning` — refunds the program's
   rent to the deploy authority. **Irreversible.** Only do this on devnet
   or before any user has interacted with the program on mainnet.

After public announcement, rollback is via `emergency_pause_admin` + 7-day
timelocked `emergency_withdraw`. Never close a program that already holds
user funds.
