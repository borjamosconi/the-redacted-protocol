# Presale de 100 SOL — configuración concreta

Documento canónico para la primera preventa de **THE REDACTED PROTOCOL**. Suma exactamente lo que vas a ejecutar: tokenómica, parámetros de inicialización, flujo end-to-end, y comandos.

## TL;DR

- **Soft cap**: 100 SOL.
- **Duración**: 7 días (24 h early-bird + 6 d pública).
- **Caps por wallet**: 5 SOL early-bird, 2 SOL pública (definidos en el contrato, inmutables sin redeploy).
- **Distribución del SOL recaudado**: 85 % liquidez · 10 % burn · 5 % tesorería (fijos en contrato).
- **Distribución del RDX (1 B supply total)**:
  - **20 % presale buyers** (200 M RDX) — entregados al rate `rdx_per_sol_early`.
  - **20 % liquidez Raydium** (200 M RDX) — pareados con 85 SOL al lanzar.
  - **20 % team / treasury vesting** — 12 m linear vest, cliff 1 m.
  - **20 % comunidad / airdrop** — fragmentos verificados, recompensas.
  - **20 % reserva / burn** — para acciones futuras de governance.
- **Si la presale NO alcanza 100 SOL** → buyers llaman `claim_refund` y recuperan su SOL.
- **Si la presale alcanza 100 SOL** → admin llama `launch()` → 85 SOL al wallet de liquidez → script crea pool Raydium con 85 SOL + 200 M RDX → LP tokens **bloqueados permanentemente** vía `rd-bondingcurve::graduate_step2_lock_lp`.

---

## Parámetros de `initialize` para la presale

```ts
const PRESALE_PARAMS = {
  // RDX por 1 SOL en early-bird (atomic units, 9 decimales).
  // 1 SOL = 2 000 000 RDX (early), 1 000 000 RDX (public — el contrato lo divide a la mitad).
  rdx_per_sol: new BN('2000000000000000'),  // 2_000_000 * 10^9

  // Soft cap en lamports. Si total_sol_raised < soft_cap al final, refunds activos.
  soft_cap:    new BN(100 * LAMPORTS_PER_SOL),  // 100 SOL = 100_000_000_000 lamports
}
```

### Math de precios y descuentos

| Métrica | Valor |
|---|---|
| Precio early-bird | 1 SOL → 2 000 000 RDX = **5 × 10⁻⁷ SOL/RDX** |
| Precio pública | 1 SOL → 1 000 000 RDX = **1 × 10⁻⁶ SOL/RDX** |
| Precio inicial LP | 85 SOL / 200 M RDX = **4.25 × 10⁻⁷ SOL/RDX** |
| Descuento early vs LP | early ≈ +17 % vs LP (early-bird paga prima por entrar primero, recibe primero, vesting 30 d) |
| Descuento public vs LP | public ≈ +135 % vs LP — **trade-off**: o mueves la curva, o aceptas que public es para believers que entran después del cap early |

> Si quieres que **early-bird sea más barato que el LP** (estándar más justo), reduce los 200 M de LP a 100 M y mantén 200 M para presale. Editar el contrato no — solo el script `create-raydium-pool.ts` que decide cuánto RDX seedea.

### Capacidad de raise

- 100 SOL ÷ 5 SOL/wallet early-bird = **20 wallets early-bird** llenan early-bird.
- 100 SOL ÷ 2 SOL/wallet pública = **50 wallets pública** llenan pública.
- Mezclas válidas: 20 × 5 SOL early + 50 × 0 SOL public = 100 SOL en 24 h, etc.

---

## Flujo end-to-end

```
T0     ─ admin: anchor build && anchor deploy
       ─ admin: ts-node scripts/init-bondingcurve.ts (configura emergency_admin, treasury sink)
       ─ admin: ts-node scripts/init-treasury.ts (whitelist team multisig)
       ─ admin: ts-node scripts/init-presale.ts (publica presale con 100 SOL soft_cap)

T0+0h  ─ buyers: dashboard /terminal → conectan wallet → buy presale (early-bird 5 SOL max)
T0+24h ─ early-bird ends, pública abre (2 SOL max/wallet)
T0+7d  ─ presale closes (end_time)

       ┌─ caso A: total_sol_raised ≥ 100 SOL (éxito)
       │
       │  T+7d   ─ admin: ts-node scripts/launch-presale.ts (llama launch())
       │            • 85 SOL → wallet de liquidez
       │            • 10 SOL → wallet de burn (1nc1nerator11…)
       │            •  5 SOL → tesorería
       │            • presale.is_launched = true
       │
       │  T+7d   ─ admin: ts-node scripts/create-raydium-pool.ts
       │            • crea OpenBook market (80 % del coste)
       │            • crea Raydium AMM v4 pool con 85 SOL + 200 M RDX
       │            • recibe LP tokens en wallet de liquidez
       │
       │  T+7d   ─ admin: ts-node scripts/lock-lp.ts
       │            • llama rd-bondingcurve::graduate_step2_lock_lp
       │            • LP tokens van a PDA [b"lp_lock_authority", lp_mint]
       │            • SIN instrucción de retiro = burn permanente
       │
       │  T+7d+  ─ buyers: dashboard /presale → claim → reciben RDX (vesting cliff aplicado)
       │
       └─ caso B: total_sol_raised < 100 SOL (fail)

         T+7d   ─ buyers: dashboard /presale → refund → recuperan su SOL
                 (admin no hace launch(); is_launched permanece false)
```

---

## Pasos manuales que tienes que hacer

### 1. Antes del deploy (local)

```bash
cd "C:\Users\mosko\Documents\THE REDACTED PROTOCOL\the_redacted_protocol\contracts"

# Verifica que los keypairs de cada programa existan; genera si no:
mkdir -p target/deploy
for p in rd_token rd_treasury rd_bondingcurve rd_presale rd_staking rd_rewards rd_governance rd_fragment rd_archive ; do
  out="target/deploy/${p}-keypair.json"
  [[ -f "$out" ]] || solana-keygen new --no-bip39-passphrase -o "$out"
  echo "$p $(solana-keygen pubkey $out)"
done
```

Copia las pubkeys impresas al `declare_id!("...")` de cada `programs/<p>/src/lib.rs` y al `[programs.mainnet]` block de `Anchor.toml`. Después:

```bash
anchor build       # genera target/idl/*.json
```

### 2. Deploy a mainnet-beta

```bash
solana config set --url <TU_RPC_PRIVADO_HELIUS_O_TRITON>
solana config set --keypair ~/.config/solana/deployer.json
solana balance                          # ≥10 SOL para fees + rent
anchor deploy --provider.cluster mainnet-beta
```

Anota los program IDs que imprime. Pégalos en:
- `pumpfun-backend/.env` → `RD_BONDINGCURVE_PROGRAM_ID`, `RD_PRESALE_PROGRAM_ID`, `RD_TOKEN_PROGRAM_ID`, `RD_TREASURY_PROGRAM_ID`
- `dashboard/.env.local` → `NEXT_PUBLIC_RD_*_PROGRAM_ID`

### 3. Mintea el token RDX y configura authority

El mint de RDX se crea **antes** del init de la presale porque la presale necesita la pubkey del mint:

```bash
# Crea el mint con 9 decimales (estándar Solana). Mint authority temporal = tu wallet.
spl-token create-token --decimals 9 --output json | tee rdx-mint.json

# Mintea el supply total (1 B RDX) a tu wallet de team:
RDX_MINT=$(jq -r .commandOutput.address rdx-mint.json)
spl-token create-account "$RDX_MINT"
spl-token mint "$RDX_MINT" 1000000000   # 1 B unidades enteras
```

Guarda `RDX_MINT` — lo usarán todos los scripts siguientes.

### 4. Init on-chain

```bash
cd contracts
npm install
ts-node scripts/init-presale.ts \
  --rdx-mint "$RDX_MINT" \
  --rpc       https://api.mainnet-beta.solana.com \
  --keypair   ~/.config/solana/deployer.json
```

El script:
- Lee `PRESALE-100SOL.md` para los parámetros (rdx_per_sol = 2e15, soft_cap = 100 SOL).
- Llama `program.methods.initialize(rdx_per_sol, soft_cap).accounts({...}).rpc()`.
- Imprime el TX signature y la presale PDA.

### 5. Anuncia la preventa

- Sitio: `https://app.redacted.bond/presale` (debe existir un panel de presale; ya hay `dashboard/src/components/PresalePanel.tsx`).
- Backend ya está vivo en `https://api.redacted.bond`.
- DNS, SSL: ✅ ya configurados.

### 6. 7 días después (T+7d)

Si llegaste a 100 SOL:

```bash
ts-node scripts/launch-presale.ts \
  --rdx-mint "$RDX_MINT" \
  --liquidity-recipient <WALLET_LIQUIDEZ> \
  --burn-wallet         1nc1nerator11111111111111111111111111111111 \
  --treasury-recipient  <WALLET_TESORERIA>

ts-node scripts/create-raydium-pool.ts \
  --rdx-mint    "$RDX_MINT" \
  --rdx-amount  200000000           # 200 M RDX (matched con 85 SOL)
  --sol-amount  85

ts-node scripts/lock-lp.ts \
  --lp-mint     <LP_MINT_FROM_PREV_STEP> \
  --lp-amount   <ALL>
```

---

## Seguridad — recordatorios críticos

1. **Auditoría externa antes de mainnet**. Sin esto, riesgo asumido por ti. Ver `PRESALE-RUNBOOK.md`.
2. **Multisig en upgrade authority** (Squads V4) antes del anuncio público.
3. **Devnet smoke completo** primero: deploy a devnet, presale fake con 0.1 SOL, refund + claim end-to-end.
4. **No commitees keypairs** (ni `target/deploy/*.json`, ni `~/.config/solana/deployer.json`). `.gitignore` ya bloquea los patrones obvios pero verifica `git status` antes de cada push.
5. **Activa `emergency_pause` desde día 1** si ves cualquier comportamiento raro. Timelock de 7 d te da margen para resolver.
