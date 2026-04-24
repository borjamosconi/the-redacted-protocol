# RDX Launchpad — pump.fun-style on Solana

End-to-end guide to build, deploy and operate the rd-bondingcurve program plus the supporting backend + dashboard.

## Architecture

```
 Phantom wallet
      │  signs tx
      ▼
 dashboard (Next.js, /launchpad /terminal /terminal/[mint])
      │  buildCreatePoolTx / buildBuyTx / buildSellTx   (src/lib/rd-bondingcurve/client.ts)
      ▼
 rd-bondingcurve  (Anchor program, contracts/programs/rd-bondingcurve)
      │  emits PoolCreated / TradeEvent / PoolGraduated
      ▼
 pumpfun-backend (Express + Socket.io)
      │  onLogs indexer → MongoDB (Trade, Candle, Token)
      ▼
 dashboard subscribes ws://<api>/socket.io → room `mint:<mint>` for live trades
```

## Economics (pump.fun parity)

| Parameter                         | Value                  |
|-----------------------------------|------------------------|
| token decimals                    | 6                      |
| total supply                      | 1,000,000,000          |
| curve supply                      | 800,000,000            |
| LP reserve (minted at graduation) | 200,000,000            |
| initial virtual SOL reserves      | 30 SOL                 |
| initial virtual token reserves    | 1,073,000,000          |
| initial real token reserves       | 793,100,000            |
| graduation threshold              | 85 SOL raised          |
| treasury fee                      | 1% per trade           |
| creator fee                       | 0.5% per trade         |

## 1. Build and deploy the program

```bash
cd contracts
anchor build          # compiles rd-bondingcurve + the other 8 rd-* programs
anchor deploy --provider.cluster mainnet-beta   # or devnet
```

Update program IDs in `contracts/Anchor.toml` (the defaults are placeholders) and re-build so `declare_id!` matches the deployed keypair.

Or run the helper:

```bash
./deploy/deploy.sh mainnet-beta
```

It:
* runs `anchor build`
* runs `anchor deploy`
* sed-updates `pumpfun-backend/.env` and `dashboard/.env.local`
* copies `contracts/target/idl/rd_bondingcurve.json` into both backend and dashboard idl folders

## 2. Bring up backend + db

```bash
cp pumpfun-backend/.env.example pumpfun-backend/.env
# fill MONGODB_URI, ADMIN_PRIVATE_KEY (base58), SOLANA_RPC, TREASURY_PUBKEY,
# RD_BONDINGCURVE_PROGRAM_ID, MIGRATION_AUTHORITY_PUBKEY

cd pumpfun-backend
npm install
npm run dev          # tsx watch — hot reload
# or
npm run start        # production single-shot
```

REST (see `src/routes/*`):
* `POST /api/tokens`                    register a newly launched mint
* `GET  /api/tokens`                    paginated list
* `GET  /api/tokens/:mint`              token + live on-chain pool snapshot
* `POST /api/tokens/:mint/trade`        indexer confirmation from tx signature
* `GET  /api/tokens/:mint/trades`       recent trades
* `GET  /api/tokens/:mint/candles`      OHLC candles (interval 1m/5m/15m/1h/4h/1d)

Socket.io:
* `socket.emit('subscribe', mint)`      joins room `mint:<mint>`
* server emits `trade`, `pool-created`, `graduated`

## 3. Dashboard

```bash
cp dashboard/.env.example dashboard/.env.local
# set NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_RD_BONDINGCURVE_PROGRAM_ID,
# NEXT_PUBLIC_TREASURY_PUBKEY, UPSTASH_REDIS_*, PINATA_*

cd dashboard
npm install
npm run dev
```

The launchpad UI (`LaunchpadPanel`) generates an AI logo, uploads metadata JSON to IPFS via Pinata (backend proxy `POST /api/tokens/metadata/pin`), and calls `buildCreatePoolTx`. The user signs with Phantom; on success the mint + tx signature are POSTed to the backend (`/api/tokens`) and mirrored in the dashboard's Redis index.

`PresalePanel` and `CinemaPanel` are unchanged from the pre-launchpad build.

## 4. Full-stack docker compose

```bash
docker compose -f deploy/docker-compose.yml up -d
# → mongo : 27017 (internal)
# → rdx-backend  : localhost:5000
# → rdx-dashboard: localhost:3000
# → nginx  : localhost:80  (proxies api.* and www.* — edit deploy/nginx.conf)
```

## 5. Graduation flow (off-chain)

When any buy pushes `real_sol_reserves >= 85 SOL`, the pool emits `PoolGraduated` and `complete = true`. After that, only the `migration_authority` can call `graduate`, which:
* mints the 200M LP reserve to the migration signer's ATA
* drains the 85 SOL out of `sol_vault` to the migration signer
* burns any leftover tokens in the curve vault

The migration signer then creates a Raydium (or Meteora) constant-product pool off-chain with those 200M tokens + 85 SOL. The burn is optional in code but on by default to match pump.fun behavior.

## 6. Security notes

* `rd-bondingcurve` transfers **mint authority** to the pool PDA and **revokes freeze authority** on pool creation — users cannot rug by minting more.
* All trade paths use checked arithmetic (`checked_add/mul/sub/div`) — overflow aborts the tx.
* Fee BPS are enforced server-side (BASIS_POINTS_DIVISOR = 10_000). `fee_bps + creator_fee_bps` must be < 10_000.
* `graduate` is restricted by `global.migration_authority` address.
* There is no admin withdrawal path from `sol_vault` except `graduate` (after `complete == true`) and user sells — i.e. SOL never leaves the curve until graduation.

## 7. Manual smoke test

```bash
cd contracts
anchor test --skip-local-validator   # requires a running validator on :8899
# or just
cargo check                          # pure compile check, no deploy
```
