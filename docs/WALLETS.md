# Redacted Protocol — Wallet Configuration

> ⚠️ Security note: these are public wallet addresses only. Never commit private keys, seed phrases, or signing material to the repository.

## Official wallets

| Role | Address | Environment variable |
|------|---------|---------------------|
| Main / Authority | `HjqNchH7bsvgi1gSo9m3wbUasmQT1TaaRbJduDQ5uyPw` | `NEXT_PUBLIC_RDX_MAIN_AUTHORITY` |
| Treasury / Team | `H4C2GpF5QLFCaY1ZSLsnnA34E1TXG6nYViQLAkNKXMeu` | `NEXT_PUBLIC_RDX_TREASURY_WALLET` |
| Airdrop distribution | `CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8` | `NEXT_PUBLIC_RDX_AIRDROP_WALLET` |

## Frontend runtime configuration

The dashboard reads these public addresses from environment variables:

- `NEXT_PUBLIC_RDX_MAIN_AUTHORITY`
- `NEXT_PUBLIC_RDX_TREASURY_WALLET`
- `NEXT_PUBLIC_RDX_AIRDROP_WALLET`
- `NEXT_PUBLIC_RDX_FACTORY_PROGRAM`
- `NEXT_PUBLIC_RDX_TOKEN_MINT`

This means:

- the source code no longer needs hardcoded wallet strings
- the app can fail closed if a value is missing or invalid
- deployment changes can be made without editing components

## Token distribution reference

For a total supply of `1,000,000,000 RDX`:

| Allocation | % | Amount | Destination |
|------------|---|--------|-------------|
| Community Airdrop | 40% | 400,000,000 | `CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8` |
| Team / Treasury | 20% | 200,000,000 | `H4C2GpF5QLFCaY1ZSLsnnA34E1TXG6nYViQLAkNKXMeu` |
| Liquidity Pool | 20% | 200,000,000 | Main authority / LP operational flow |
| Staking Rewards | 10% | 100,000,000 | Main authority / staking flow |
| Treasury / DAO | 10% | 100,000,000 | `H4C2GpF5QLFCaY1ZSLsnnA34E1TXG6nYViQLAkNKXMeu` |

## Launchpad fee routing

- **Launch fee**: `0.02 SOL`
- **Destination**: treasury wallet → `H4C2GpF5QLFCaY1ZSLsnnA34E1TXG6nYViQLAkNKXMeu`

## Operational guidance

- Use only public addresses in the repo.
- Keep private keys and seed phrases outside Git.
- Prefer multisig custody for treasury operations.
- Verify all addresses before any mainnet deployment.
- Keep `dashboard/.env.local.example` in sync with the runtime config.

## Quick checklist

- [ ] Confirm `NEXT_PUBLIC_RDX_MAIN_AUTHORITY`
- [ ] Confirm `NEXT_PUBLIC_RDX_TREASURY_WALLET`
- [ ] Confirm `NEXT_PUBLIC_RDX_AIRDROP_WALLET`
- [ ] Confirm `NEXT_PUBLIC_RDX_FACTORY_PROGRAM`
- [ ] Confirm `NEXT_PUBLIC_RDX_TOKEN_MINT`
- [ ] Verify devnet behavior before mainnet
- [ ] Keep private keys out of the repo
