# Activar el launchpad pump.fun-style en `app.redacted.bond` — guía gratis

Lo único que te separa de tener el launchpad funcionando online (cualquiera lanza un token, compra/vende en bonding curve, gradúa a Raydium) son **6 pasos**. Los primeros 5 son **0 € en devnet**, el último (mainnet) cuesta ~3-4 SOL.

> **Estado actual** (`https://app.redacted.bond`):
> - Dashboard: ✅ live (Next.js, PM2 `rdx-dashboard`)
> - Backend: ✅ live (Express + Mongo + Socket.io, PM2 `rdx-backend`)
> - Smart contracts: ✅ código completo, compila, testeado en local
> - Lo que falta: deploy on-chain + sustituir IDL stub + 1 init tx + actualizar `.env`

## Pre-flight (una sola vez en tu máquina local)

```bash
# Solana CLI + Anchor CLI
sh -c "$(curl -sSfL https://release.anchor-lang.com/v0.30.1/install)"
sh -c "$(curl -sSfL https://release.solana.com/v1.18.20/install)"

# Verifica:
solana --version    # debería ser ≥1.18
anchor --version    # debería ser 0.30.1

# Wallet de deploy (si no tienes una):
solana-keygen new --outfile ~/.config/solana/deployer.json
solana config set --keypair ~/.config/solana/deployer.json
```

---

## Paso 1 — Deploy a **devnet** (gratis)

```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 5    # gratis, repetible si lo necesitas

cd "C:\Users\mosko\Documents\THE REDACTED PROTOCOL\the_redacted_protocol\contracts"

# Genera keypairs de los programas (si no existen):
mkdir -p target/deploy
for p in rd_token rd_treasury rd_bondingcurve rd_presale ; do
  out="target/deploy/${p}-keypair.json"
  [[ -f "$out" ]] || solana-keygen new --no-bip39-passphrase -o "$out"
  echo "$p $(solana-keygen pubkey $out)"
done

# IMPORTANTE: copia las pubkeys impresas y pégalas en:
#   programs/<p>/src/lib.rs   →  declare_id!("...")
#   Anchor.toml               →  [programs.devnet] sección
# (una pubkey por programa)

anchor build                                     # genera target/idl/*.json
anchor deploy --provider.cluster devnet          # ~10 segundos por programa
```

**Coste devnet: 0 SOL real.** Los SOL de devnet son fake e ilimitados.

Para mainnet más tarde: `--provider.cluster mainnet-beta` y necesitas ~3-4 SOL reales en `~/.config/solana/deployer.json`.

---

## Paso 2 — Sustituir IDL stub por el real

```bash
# El stub actual está en dashboard/src/lib/rd-bondingcurve/idl.ts
# Reemplázalo por el JSON real generado en `anchor build`:

cp target/idl/rd_bondingcurve.json ../dashboard/src/lib/rd-bondingcurve/idl.json

# Y reemplaza el contenido de idl.ts por:
cat > ../dashboard/src/lib/rd-bondingcurve/idl.ts <<'EOF'
import idlJson from './idl.json'
export type BondingCurveIDL = typeof idlJson
export const IDL: BondingCurveIDL = idlJson as BondingCurveIDL
EOF

# Backend igual:
mkdir -p ../pumpfun-backend/src/program/idl
cp target/idl/rd_bondingcurve.json ../pumpfun-backend/src/program/idl/
```

---

## Paso 3 — Llamar `initialize_global` una vez

```bash
cd contracts
npm install      # primera vez, instala anchor + spl-token + ts-node
npm run init-bondingcurve -- \
  --treasury           <TU_TESORERIA_PUBKEY> \
  --migration-authority <TU_PUBKEY> \
  --emergency-admin    <TU_PUBKEY> \
  --rpc                https://api.devnet.solana.com \
  --keypair            ~/.config/solana/deployer.json
```

**Una sola vez.** Crea la PDA `[b"global"]` que cualquier `create_pool` referenciará. Tras esto, **cualquiera** puede crear tokens desde el dashboard.

---

## Paso 4 — Configurar `.env` en VPS

```bash
ssh root@69.62.116.165
cd /opt/redacted-new

# Backend:
nano pumpfun-backend/.env
# RD_BONDINGCURVE_PROGRAM_ID=<pubkey de target/deploy/rd_bondingcurve-keypair.json>
# RD_TOKEN_PROGRAM_ID=<...>
# RD_TREASURY_PROGRAM_ID=<...>
# SOLANA_RPC=https://api.devnet.solana.com    (o mainnet)
# SOLANA_CLUSTER=devnet                       (o mainnet-beta)
# ADMIN_PRIVATE_KEY=<base58 de tu deployer keypair>   ← log listener lo necesita
# TREASURY_PUBKEY=<misma de paso 3>
# MIGRATION_AUTHORITY_PUBKEY=<misma de paso 3>

# Dashboard:
nano dashboard/.env.local
# NEXT_PUBLIC_RD_BONDINGCURVE_PROGRAM_ID=<misma pubkey>
# NEXT_PUBLIC_TREASURY_PUBKEY=<misma>
# NEXT_PUBLIC_BACKEND_URL=https://api.redacted.bond
# NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com

# Build dashboard con nuevos envs y restart:
cd dashboard && NODE_OPTIONS='--max-old-space-size=2048' npm run build
cd ..
pm2 restart rdx-backend rdx-dashboard --update-env
pm2 logs --lines 20    # debería ver "rd-bondingcurve log listener attached"
```

---

## Paso 5 — Probar el flow end-to-end

1. Abre `https://app.redacted.bond` en navegador (con Phantom apuntando a **devnet**).
2. Conecta wallet → ve a **Launchpad** panel.
3. Rellena name + symbol, generas imagen AI (Pollinations gratis), `LAUNCH TOKEN`.
4. Phantom firma 1 tx: crea mint + pool en rd-bondingcurve.
5. Te redirige a `/terminal/<MINT>`.
6. TokenChart aparece (vacío al principio).
7. Otro wallet (o el mismo) compra 0.1 SOL → tx → log listener captura `TradeEvent` → backend lo escribe en Mongo → socket.io emite → chart se actualiza en 1-2 s.
8. Vendes parte → mismo flow inverso.
9. Si llegas a 85 SOL en el pool: gradúa, `graduate_step1_drain` corre, dispara la migración a Raydium.

> **Phantom en devnet**: Settings → Developer Settings → Active Network → **Devnet**. Pide airdrop con `solana airdrop 5 <TU_PUBKEY> --url devnet` desde tu máquina si Phantom no tiene SOL devnet.

---

## Paso 6 — Pasar a mainnet (cuando estés convencido)

Idéntico a paso 1, pero:

```bash
solana config set --url https://api.mainnet-beta.solana.com
# Necesitas ≥4 SOL reales en deployer.json
anchor deploy --provider.cluster mainnet-beta
# Repite pasos 2-5 con --provider.cluster mainnet-beta y RPC mainnet
```

**Coste mainnet:**
- Deploy 3 programas (token + treasury + bondingcurve): ~3 SOL
- `initialize_global` tx: ~0.002 SOL
- Cada `create_pool` que haga un user: ~0.01 SOL (la paga el user, no tú)
- Cada `buy/sell`: ~0.0005 SOL fees

Para mainnet, MUY recomendado:
- Helius RPC (gratis hasta 100k req/mes): pone `https://devnet.helius-rpc.com/?api-key=...` y `mainnet-beta` igual
- Squads V4 multisig en upgrade authority del programa después del deploy:
  ```
  solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <SQUADS_MULTISIG>
  ```

---

## Lo que YA funciona sin tocar nada más

- ✅ AI image gen (Pollinations free)
- ✅ Metadata pin (data:URI fallback si no configuras Pinata; gratis)
- ✅ Backend log listener (suscripción WebSocket a logs del programa, indexa trades a Mongo)
- ✅ Socket.io live updates al chart
- ✅ Refund + emergency pause + LP lock en contratos
- ✅ HTTPS, dominios, SSL en `app.redacted.bond` y `api.redacted.bond`

## Lo que NO está hecho y necesitas decidir

- **Auditoría externa**: 0 € si la saltas (riesgo asumido), 15-30k € si pagas OtterSec/Ackee. Con bug bounty (5 SOL) en ImmuneFi tienes algo intermedio.
- **Raydium migration on-chain**: actualmente `graduate_step1_drain` saca el SOL al `migration_authority`; el script `create-raydium-pool.ts` queda como skeleton. Para mainnet activar de verdad la graduación necesitas terminarlo (~300 líneas SDK Raydium V2). En devnet puedes saltarlo y dejar tokens en bonding curve perpetua.
- **Programa deployed con keypair propia**: el upgrade authority es tu wallet hasta que la transfieras a multisig. Si te roban la key, controlan el programa.

## Troubleshooting

| Síntoma | Causa | Fix |
|---|---|---|
| `LAUNCH TOKEN` falla con "ProgramId mismatch" | IDL stub vs program real | Asegúrate de copiar el IDL real (paso 2) |
| Backend log listener no arranca | `ADMIN_PRIVATE_KEY` falta | Pon la base58 de la deployer keypair en `.env` |
| Chart no actualiza | Socket.io desconectado | Verifica nginx `/socket.io/` proxy y `pm2 logs rdx-backend` |
| `initialize_global` falla con "AccountAlreadyInUse" | Ya lo llamaste | OK, no hagas nada más |
| Phantom no firma | Wrong network | Cambia Phantom a Devnet en settings |
