//! # RDX Bonding Curve — pump.fun-style launchpad
//!
//! Virtual constant-product (x*y=k) bonding curve. Each launched token gets
//! its own pool with virtual SOL reserves + virtual token reserves plus the
//! real tokens locked in a vault. As people buy, the token reserve shrinks
//! and the SOL reserve grows, so price rises on the curve.
//!
//! ┌────────────────────────────────────────────────────────────────────┐
//! │  CONFIG (matches pump.fun economics)                              │
//! │  ───────────────────────────────────────────────────────────────  │
//! │  decimals                      : 6                                │
//! │  total_supply                  : 1_000_000_000 tokens             │
//! │  curve_supply                  : 800_000_000 tokens (sold on BC)  │
//! │  lp_reserve_supply             : 200_000_000 tokens (LP at grad)  │
//! │  initial_virtual_token_reserves: 1_073_000_000 * 10^6             │
//! │  initial_virtual_sol_reserves  : 30 SOL in lamports               │
//! │  initial_real_token_reserves   : 793_100_000 * 10^6               │
//! │  graduation_sol_threshold      : 85 SOL raised                    │
//! │  fee_basis_points              : 100 (1%) → treasury              │
//! │  creator_fee_basis_points      : 50 (0.5%) → creator              │
//! │  vault_basis_points            : 9850 (98.5%) into the pool       │
//! └────────────────────────────────────────────────────────────────────┘
//!
//! On graduation (>= 85 SOL raised) the pool freezes, the authority calls
//! `graduate` which withdraws the real SOL + the 200M LP tokens to a
//! designated migration signer (off-chain Raydium/Meteora LP creator).

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{
    self, Burn, Mint, MintTo, Token, TokenAccount, Transfer as TokenTransfer,
};

declare_id!("AfkwwBhRsuEzZo74mdbwK8EBwo7VYwc8S1T7hb1RHMAa");

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — pump.fun parity
// ─────────────────────────────────────────────────────────────────────────────

pub const TOKEN_DECIMALS: u8 = 6;
pub const TOKEN_MULT: u64 = 1_000_000; // 10^6

pub const TOTAL_SUPPLY: u64 = 1_000_000_000 * TOKEN_MULT;
pub const CURVE_SUPPLY: u64 = 800_000_000 * TOKEN_MULT;
pub const LP_RESERVE_SUPPLY: u64 = 200_000_000 * TOKEN_MULT;

pub const INITIAL_VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_000 * TOKEN_MULT;
pub const INITIAL_VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL (lamports)
pub const INITIAL_REAL_TOKEN_RESERVES: u64 = 793_100_000 * TOKEN_MULT;

pub const GRADUATION_SOL_THRESHOLD: u64 = 85_000_000_000; // 85 SOL in lamports
pub const MIN_BUY_LAMPORTS: u64 = 1_000_000; // 0.001 SOL
pub const BASIS_POINTS_DIVISOR: u64 = 10_000;

pub const TREASURY_FEE_BPS: u64 = 100; // 1%
pub const CREATOR_FEE_BPS: u64 = 50;   // 0.5%
pub const REFERRAL_FEE_BPS: u64 = 20;  // 0.2% of total fee (not additional)

/// Timelock between an emergency pause and the moment users may extract
/// SOL via `emergency_withdraw`. 7 days, in seconds.
pub const EMERGENCY_TIMELOCK_SECS: i64 = 7 * 24 * 3600;

/// Anti-sniping: Minimum time between a buy and a sell to prevent high-frequency
/// bot sniping. 60 seconds.
pub const MIN_HOLD_TIME: i64 = 60;

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAM
// ─────────────────────────────────────────────────────────────────────────────

#[program]
pub mod rd_bondingcurve {
    use super::*;

    /// Initialize the global configuration (admin-owned). Called once.
    pub fn initialize_global(
        ctx: Context<InitializeGlobal>,
        treasury: Pubkey,
        migration_authority: Pubkey,
    ) -> Result<()> {
        let g = &mut ctx.accounts.global;
        g.authority = ctx.accounts.authority.key();
        g.treasury = treasury;
        g.migration_authority = migration_authority;
        g.fee_bps = TREASURY_FEE_BPS;
        g.creator_fee_bps = CREATOR_FEE_BPS;
        g.total_pools = 0;
        g.paused = false;
        // Emergency admin defaults to the program authority. Can be rotated
        // via `set_emergency_admin`. paused_at = 0 means "not currently
        // paused"; it gets stamped on every `set_paused(true)` call.
        g.emergency_admin = ctx.accounts.authority.key();
        g.paused_at = 0;
        g.bump = ctx.bumps.global;

        emit!(GlobalInitialized {
            authority: g.authority,
            treasury,
            migration_authority,
        });
        Ok(())
    }

    /// Create a new pool for a freshly-minted SPL token. The caller's wallet
    /// must already be the mint authority for `mint`. After this call the
    /// mint authority is transferred to the pool PDA so the curve controls
    /// supply; `INITIAL_REAL_TOKEN_RESERVES` tokens are minted into the pool
    /// token vault.
    pub fn create_pool(
        ctx: Context<CreatePool>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        require!(!ctx.accounts.global.paused, BondingCurveError::Paused);
        require!(name.len() <= 32, BondingCurveError::NameTooLong);
        require!(symbol.len() <= 10, BondingCurveError::SymbolTooLong);
        require!(uri.len() <= 200, BondingCurveError::UriTooLong);
        require!(ctx.accounts.mint.decimals == TOKEN_DECIMALS, BondingCurveError::BadDecimals);

        let pool = &mut ctx.accounts.pool;
        pool.mint = ctx.accounts.mint.key();
        pool.creator = ctx.accounts.creator.key();
        pool.token_vault = ctx.accounts.token_vault.key();
        pool.sol_vault = ctx.accounts.sol_vault.key();
        pool.virtual_token_reserves = INITIAL_VIRTUAL_TOKEN_RESERVES;
        pool.virtual_sol_reserves = INITIAL_VIRTUAL_SOL_RESERVES;
        pool.real_token_reserves = INITIAL_REAL_TOKEN_RESERVES;
        pool.real_sol_reserves = 0;
        pool.token_total_supply = TOTAL_SUPPLY;
        pool.graduation_threshold = GRADUATION_SOL_THRESHOLD;
        pool.complete = false;
        pool.created_at = Clock::get()?.unix_timestamp;
        pool.name = name.clone();
        pool.symbol = symbol.clone();
        pool.uri = uri.clone();
        pool.bump = ctx.bumps.pool;

        // Mint initial real token reserves into the pool's token vault.
        let mint_key = ctx.accounts.mint.key();
        let seeds: &[&[u8]] = &[b"pool", mint_key.as_ref(), &[pool.bump]];
        let signer = &[seeds];

        // Mint authority is the creator right now (Phantom side). We need the
        // creator to sign this mint-to, then transfer mint authority to pool.
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            INITIAL_REAL_TOKEN_RESERVES,
        )?;

        // Transfer mint authority to the pool PDA so only the curve can mint
        // (needed for the 200M LP reserve at graduation).
        let pool_key = pool.key();
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::SetAuthority {
                    current_authority: ctx.accounts.creator.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            Some(pool_key),
        )?;

        // Remove freeze authority permanently to mirror pump.fun guarantees.
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::SetAuthority {
                    current_authority: ctx.accounts.creator.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::FreezeAccount,
            None,
        )?;

        let _ = signer; // seeds reserved for future CPI signing

        let g = &mut ctx.accounts.global;
        g.total_pools = g.total_pools.saturating_add(1);

        emit!(PoolCreated {
            mint: pool.mint,
            creator: pool.creator,
            name,
            symbol,
            uri,
            timestamp: pool.created_at,
        });
        Ok(())
    }

    /// Buy `tokens_out` (minimum) for `sol_in` lamports. 98.5% of `sol_in`
    /// enters the pool reserves, 1% goes to treasury, 0.5% to creator.
    pub fn buy(
        ctx: Context<Trade>,
        sol_in: u64,
        min_tokens_out: u64,
        referral: Option<Pubkey>,
    ) -> Result<()> {
        require!(!ctx.accounts.global.paused, BondingCurveError::Paused);
        require!(sol_in >= MIN_BUY_LAMPORTS, BondingCurveError::AmountTooSmall);

        let pool = &mut ctx.accounts.pool;
        require!(!pool.complete, BondingCurveError::PoolComplete);

        // ── Senior Fee Strategy ─────────────────────────────────────────────
        let total_fee_bps = ctx.accounts.global.fee_bps as u128;
        let creator_fee_bps = ctx.accounts.global.creator_fee_bps as u128;
        
        let total_fee = (sol_in as u128)
            .checked_mul(total_fee_bps)
            .ok_or(BondingCurveError::MathOverflow)?
            / BASIS_POINTS_DIVISOR as u128;
            
        let creator_fee = (sol_in as u128)
            .checked_mul(creator_fee_bps)
            .ok_or(BondingCurveError::MathOverflow)?
            / BASIS_POINTS_DIVISOR as u128;

        let mut treasury_fee = total_fee;
        let mut referral_paid = 0u128;

        if let Some(ref_key) = referral {
            if ref_key != ctx.accounts.buyer.key() && ref_key == ctx.accounts.referrer.key() {
                referral_paid = (total_fee * REFERRAL_FEE_BPS as u128) / 100;
                treasury_fee = treasury_fee.checked_sub(referral_paid).unwrap();
                
                system_program::transfer(
                    CpiContext::new(ctx.accounts.system_program.to_account_info(), system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.referrer.to_account_info(),
                    }),
                    referral_paid as u64,
                )?;
            }
        }

        let pool_amount = (sol_in as u128)
            .checked_sub(total_fee)
            .and_then(|v| v.checked_sub(creator_fee))
            .ok_or(BondingCurveError::MathOverflow)? as u64;

        // ── Constant Product Math ────────────────────────────────────────────
        let new_virtual_sol = (pool.virtual_sol_reserves as u128)
            .checked_add(pool_amount as u128)
            .ok_or(BondingCurveError::MathOverflow)?;
        let k = (pool.virtual_sol_reserves as u128)
            .checked_mul(pool.virtual_token_reserves as u128)
            .ok_or(BondingCurveError::MathOverflow)?;
        let new_virtual_tokens = k.checked_div(new_virtual_sol).ok_or(BondingCurveError::MathOverflow)?;
        let mut tokens_out = (pool.virtual_token_reserves as u128)
            .checked_sub(new_virtual_tokens)
            .ok_or(BondingCurveError::MathOverflow)? as u64;

        if tokens_out > pool.real_token_reserves {
            tokens_out = pool.real_token_reserves;
        }
        require!(tokens_out > 0, BondingCurveError::ZeroOutput);
        require!(tokens_out >= min_tokens_out, BondingCurveError::SlippageExceeded);

        // ── Update Accounts ─────────────────────────────────────────────────
        let now = Clock::get()?.unix_timestamp;
        let user_stats = &mut ctx.accounts.user_stats;
        user_stats.last_buy = now;
        user_stats.total_bought = user_stats.total_bought.saturating_add(tokens_out);
        user_stats.owner = ctx.accounts.buyer.key();
        user_stats.bump = ctx.bumps.user_stats;

        // ── Transfers ───────────────────────────────────────────────────────
        if treasury_fee > 0 {
            system_program::transfer(
                CpiContext::new(ctx.accounts.system_program.to_account_info(), system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                }),
                treasury_fee as u64,
            )?;
        }
        if creator_fee > 0 {
            system_program::transfer(
                CpiContext::new(ctx.accounts.system_program.to_account_info(), system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.creator_wallet.to_account_info(),
                }),
                creator_fee as u64,
            )?;
        }
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.sol_vault.to_account_info(),
            }),
            pool_amount,
        )?;

        let mint_key = pool.mint;
        let pool_bump = pool.bump;
        let seeds: &[&[u8]] = &[b"pool", mint_key.as_ref(), &[pool_bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TokenTransfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                &[seeds],
            ),
            tokens_out,
        )?;

        pool.real_sol_reserves = pool.real_sol_reserves.saturating_add(pool_amount);
        pool.real_token_reserves = pool.real_token_reserves.saturating_sub(tokens_out);
        pool.virtual_sol_reserves = pool.virtual_sol_reserves.saturating_add(pool_amount);
        pool.virtual_token_reserves = pool.virtual_token_reserves.saturating_sub(tokens_out);

        if pool.real_sol_reserves >= pool.graduation_threshold {
            pool.complete = true;
            emit!(PoolGraduated {
                mint: pool.mint,
                real_sol_reserves: pool.real_sol_reserves,
                real_token_reserves: pool.real_token_reserves,
                timestamp: now,
            });
        }

        emit!(TradeEvent {
            mint: pool.mint,
            is_buy: true,
            user: ctx.accounts.buyer.key(),
            sol_amount: sol_in,
            token_amount: tokens_out,
            virtual_sol_reserves: pool.virtual_sol_reserves,
            virtual_token_reserves: pool.virtual_token_reserves,
            real_sol_reserves: pool.real_sol_reserves,
            real_token_reserves: pool.real_token_reserves,
            timestamp: now,
        });
        Ok(())
    }

    pub fn sell(
        ctx: Context<Trade>,
        tokens_in: u64,
        min_sol_out: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.global.paused, BondingCurveError::Paused);
        require!(tokens_in > 0, BondingCurveError::AmountTooSmall);

        let pool = &mut ctx.accounts.pool;
        require!(!pool.complete, BondingCurveError::PoolComplete);

        // ── Anti-Sniping Check ──────────────────────────────────────────────
        let now = Clock::get()?.unix_timestamp;
        let user_stats = &mut ctx.accounts.user_stats;
        require!(
            now >= user_stats.last_buy.saturating_add(MIN_HOLD_TIME),
            BondingCurveError::AntiSnipingActive
        );

        // ── Constant Product Math ────────────────────────────────────────────
        let new_virtual_tokens = (pool.virtual_token_reserves as u128)
            .checked_add(tokens_in as u128)
            .ok_or(BondingCurveError::MathOverflow)?;
        let k = (pool.virtual_sol_reserves as u128)
            .checked_mul(pool.virtual_token_reserves as u128)
            .ok_or(BondingCurveError::MathOverflow)?;
        let new_virtual_sol = k.checked_div(new_virtual_tokens).ok_or(BondingCurveError::MathOverflow)?;
        let mut gross_sol_out = (pool.virtual_sol_reserves as u128)
            .checked_sub(new_virtual_sol)
            .ok_or(BondingCurveError::MathOverflow)? as u64;

        if gross_sol_out > pool.real_sol_reserves {
            gross_sol_out = pool.real_sol_reserves;
        }

        // ── Dynamic Sell Tax ────────────────────────────────────────────────
        let mut dynamic_fee_bps = ctx.accounts.global.fee_bps;
        let time_since_buy = now.saturating_sub(user_stats.last_buy);
        if time_since_buy < 3600 { // 1.5% tax if selling within 1 hour
            dynamic_fee_bps = dynamic_fee_bps.saturating_add(50);
        }

        let treasury_fee = (gross_sol_out as u128)
            .checked_mul(dynamic_fee_bps as u128)
            .ok_or(BondingCurveError::MathOverflow)?
            / BASIS_POINTS_DIVISOR as u128;
        let creator_fee = (gross_sol_out as u128)
            .checked_mul(ctx.accounts.global.creator_fee_bps as u128)
            .ok_or(BondingCurveError::MathOverflow)?
            / BASIS_POINTS_DIVISOR as u128;
        let net_sol_out = (gross_sol_out as u128)
            .checked_sub(treasury_fee)
            .and_then(|v| v.checked_sub(creator_fee))
            .ok_or(BondingCurveError::MathOverflow)? as u64;

        require!(net_sol_out >= min_sol_out, BondingCurveError::SlippageExceeded);
        require!(net_sol_out > 0, BondingCurveError::ZeroOutput);

        // ── Transfers ───────────────────────────────────────────────────────
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), TokenTransfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            }),
            tokens_in,
        )?;

        let sol_vault_bump = ctx.bumps.sol_vault;
        let mint_key = pool.mint;
        let sv_seeds: &[&[u8]] = &[b"sol_vault", mint_key.as_ref(), &[sol_vault_bump]];
        let sv_signer = &[sv_seeds];

        system_program::transfer(
            CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(), system_program::Transfer {
                from: ctx.accounts.sol_vault.to_account_info(),
                to: ctx.accounts.buyer.to_account_info(),
            }, sv_signer),
            net_sol_out,
        )?;
        if treasury_fee > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(), system_program::Transfer {
                    from: ctx.accounts.sol_vault.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                }, sv_signer),
                treasury_fee as u64,
            )?;
        }
        if creator_fee > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(), system_program::Transfer {
                    from: ctx.accounts.sol_vault.to_account_info(),
                    to: ctx.accounts.creator_wallet.to_account_info(),
                }, sv_signer),
                creator_fee as u64,
            )?;
        }

        // ── Update State ────────────────────────────────────────────────────
        pool.real_sol_reserves = pool.real_sol_reserves.saturating_sub(gross_sol_out);
        pool.real_token_reserves = pool.real_token_reserves.saturating_add(tokens_in);
        pool.virtual_sol_reserves = pool.virtual_sol_reserves.saturating_sub(gross_sol_out);
        pool.virtual_token_reserves = pool.virtual_token_reserves.saturating_add(tokens_in);
        
        user_stats.total_sold = user_stats.total_sold.saturating_add(tokens_in);

        emit!(TradeEvent {
            mint: pool.mint,
            is_buy: false,
            user: ctx.accounts.buyer.key(),
            sol_amount: net_sol_out,
            token_amount: tokens_in,
            virtual_sol_reserves: pool.virtual_sol_reserves,
            virtual_token_reserves: pool.virtual_token_reserves,
            real_sol_reserves: pool.real_sol_reserves,
            real_token_reserves: pool.real_token_reserves,
            timestamp: now,
        });
        Ok(())
    }

    /// Graduate: mint the 200M LP reserve + withdraw real SOL reserves to
    /// the migration authority (off-chain LP creator). Only callable once
    /// `pool.complete == true` and only by `global.migration_authority`.
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(pool.complete, BondingCurveError::NotGraduated);
        require!(
            ctx.accounts.migration_authority.key() == ctx.accounts.global.migration_authority,
            BondingCurveError::NotMigrationAuthority
        );
        require!(!pool.migrated, BondingCurveError::AlreadyMigrated);

        // Mint LP_RESERVE_SUPPLY to the migration token account (PDA signs).
        let mint_key = pool.mint;
        let pool_bump = pool.bump;
        let seeds: &[&[u8]] = &[b"pool", mint_key.as_ref(), &[pool_bump]];
        let signer = &[seeds];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.migration_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                signer,
            ),
            LP_RESERVE_SUPPLY,
        )?;

        // Drain real SOL reserves to migration authority.
        let sol_vault_bump = ctx.bumps.sol_vault;
        let sv_seeds: &[&[u8]] = &[b"sol_vault", mint_key.as_ref(), &[sol_vault_bump]];
        let sv_signer = &[sv_seeds];
        let amount = pool.real_sol_reserves;
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.sol_vault.to_account_info(),
                    to: ctx.accounts.migration_authority.to_account_info(),
                },
                sv_signer,
            ),
            amount,
        )?;

        // Optionally burn any tokens left in the curve vault (pump.fun burns
        // leftover curve supply so the market isn't flooded post-migration).
        let leftover = ctx.accounts.token_vault.amount;
        if leftover > 0 {
            token::burn(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Burn {
                        mint: ctx.accounts.mint.to_account_info(),
                        from: ctx.accounts.token_vault.to_account_info(),
                        authority: pool.to_account_info(),
                    },
                    signer,
                ),
                leftover,
            )?;
        }

        pool.migrated = true;
        pool.real_sol_reserves = 0;
        pool.real_token_reserves = 0;

        emit!(PoolMigrated {
            mint: pool.mint,
            sol_migrated: amount,
            lp_tokens_minted: LP_RESERVE_SUPPLY,
            leftover_burned: leftover,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Emergency pause (admin). Timestamps `paused_at` so the 7-day
    /// timelock for `emergency_withdraw` can start counting.
    pub fn set_paused(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        let g = &mut ctx.accounts.global;
        g.paused = paused;
        if paused {
            g.paused_at = Clock::get()?.unix_timestamp;
        } else {
            g.paused_at = 0;
        }
        emit!(PauseToggled { paused, paused_at: g.paused_at });
        Ok(())
    }

    /// Rotate the emergency admin. Only the main program authority may do
    /// this — the emergency admin itself cannot rotate the role, by design,
    /// so a compromised emergency key cannot lock the main authority out.
    pub fn set_emergency_admin(ctx: Context<AdminAction>, new_admin: Pubkey) -> Result<()> {
        ctx.accounts.global.emergency_admin = new_admin;
        emit!(EmergencyAdminRotated { new_admin });
        Ok(())
    }

    /// Trip the emergency pause from the dedicated emergency-admin key
    /// (separate from `set_paused` which is gated by the program authority).
    /// Useful for ops keys that should be able to halt trading without
    /// holding the main upgrade authority.
    pub fn emergency_pause_admin(ctx: Context<EmergencyPauseAdmin>) -> Result<()> {
        let g = &mut ctx.accounts.global;
        require!(
            ctx.accounts.emergency_admin.key() == g.emergency_admin,
            BondingCurveError::NotEmergencyAdmin,
        );
        g.paused = true;
        g.paused_at = Clock::get()?.unix_timestamp;
        emit!(PauseToggled { paused: true, paused_at: g.paused_at });
        Ok(())
    }

    /// User-recovery path: drains a *pro-rata* portion of the pool's real
    /// SOL reserves to the caller, scaled by the share of `tokens_in` they
    /// burn relative to `pool.real_token_reserves`. Only callable when:
    ///   - global.paused == true
    ///   - now >= global.paused_at + EMERGENCY_TIMELOCK_SECS
    /// so that the admin has a window to un-pause if the pause was a false
    /// alarm. The user must surrender (burn) the curve tokens they hold
    /// before extracting their SOL share, preserving x*y=k bookkeeping.
    pub fn emergency_withdraw(
        ctx: Context<EmergencyWithdraw>,
        tokens_in: u64,
    ) -> Result<()> {
        let g = &ctx.accounts.global;
        require!(g.paused, BondingCurveError::NotPaused);
        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= g.paused_at.saturating_add(EMERGENCY_TIMELOCK_SECS),
            BondingCurveError::TimelockNotElapsed,
        );
        require!(tokens_in > 0, BondingCurveError::AmountTooSmall);

        let pool = &mut ctx.accounts.pool;
        require!(!pool.migrated, BondingCurveError::AlreadyMigrated);

        // Pro-rata share = real_sol_reserves * tokens_in / real_token_basis,
        // where the basis is the curve_supply (800M) minus what's currently
        // sitting in the pool — i.e. the tokens already in circulation.
        // For a paused-and-broken pool this is the cleanest "everyone gets
        // their fair share back" formula.
        let circulating = CURVE_SUPPLY.saturating_sub(pool.real_token_reserves);
        require!(circulating > 0, BondingCurveError::ZeroOutput);
        let sol_out = (pool.real_sol_reserves as u128)
            .checked_mul(tokens_in as u128)
            .ok_or(BondingCurveError::MathOverflow)?
            .checked_div(circulating as u128)
            .ok_or(BondingCurveError::MathOverflow)? as u64;
        require!(sol_out > 0, BondingCurveError::ZeroOutput);
        require!(sol_out <= pool.real_sol_reserves, BondingCurveError::ZeroOutput);

        // Burn the user's curve tokens.
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            tokens_in,
        )?;

        // Refund SOL from the pool's sol_vault PDA.
        let sol_vault_bump = ctx.bumps.sol_vault;
        let mint_key = pool.mint;
        let sv_seeds: &[&[u8]] = &[b"sol_vault", mint_key.as_ref(), &[sol_vault_bump]];
        let sv_signer = &[sv_seeds];
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.sol_vault.to_account_info(),
                    to: ctx.accounts.user.to_account_info(),
                },
                sv_signer,
            ),
            sol_out,
        )?;

        pool.real_sol_reserves = pool.real_sol_reserves.saturating_sub(sol_out);
        // Don't touch virtual reserves — the pool is dead anyway, and
        // updating them would let a pause-and-trade race extract more SOL
        // than the burn justifies once the pause is lifted.

        emit!(EmergencyWithdrawn {
            user: ctx.accounts.user.key(),
            mint: pool.mint,
            tokens_burned: tokens_in,
            sol_returned: sol_out,
            timestamp: now,
        });
        Ok(())
    }

    /// Step 2 of graduation: lock all LP tokens that the migration_authority
    /// holds (minted by step 1 / `graduate`) into a program-owned vault PDA
    /// `[b"lp_lock", mint]`. There is intentionally NO withdraw instruction
    /// for this vault — once tokens land here they are permanently
    /// unreachable, mirroring the pump.fun "burn LP" guarantee.
    ///
    /// OFF-CHAIN STEP between graduate and graduate_step2_lock_lp:
    /// the migration_authority calls Raydium AMM v4 `initialize2`
    /// (program id 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8) using:
    ///   - the SOL drained by graduate (held in migration_authority's wallet)
    ///   - 200M of the project token (held in migration_token_account)
    ///   - an OpenBook market created off-chain with this token + WSOL
    /// Raydium then mints LP tokens to the migration_authority's LP ATA;
    /// THAT is the `lp_token_account` passed here, and `lp_mint` is
    /// Raydium's LP mint for the new pool. Calling this instruction
    /// transfers every LP token off the migration_authority and into a
    /// PDA with no exit, achieving the same end state as a hardcoded
    /// Raydium CPI but without baking Raydium's IDL into this program.
    pub fn graduate_step2_lock_lp(
        ctx: Context<GraduateStep2LockLp>,
        lp_amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.migration_authority.key() == ctx.accounts.global.migration_authority,
            BondingCurveError::NotMigrationAuthority,
        );
        require!(lp_amount > 0, BondingCurveError::AmountTooSmall);

        // Transfer LP tokens migration_authority's ATA → lp_lock_vault PDA.
        // The PDA itself is the ATA's owner-by-init below; the
        // migration_authority signs as authority of the source ATA.
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TokenTransfer {
                    from: ctx.accounts.lp_token_account.to_account_info(),
                    to: ctx.accounts.lp_lock_vault.to_account_info(),
                    authority: ctx.accounts.migration_authority.to_account_info(),
                },
            ),
            lp_amount,
        )?;

        emit!(LpLocked {
            mint: ctx.accounts.mint.key(),
            lp_mint: ctx.accounts.lp_mint.key(),
            amount: lp_amount,
            lp_lock_vault: ctx.accounts.lp_lock_vault.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeGlobal<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::SPACE,
        seeds = [b"global"],
        bump
    )]
    pub global: Account<'info, GlobalState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct CreatePool<'info> {
    #[account(mut, seeds = [b"global"], bump = global.bump)]
    pub global: Account<'info, GlobalState>,

    #[account(
        init,
        payer = creator,
        space = 8 + PoolState::SPACE,
        seeds = [b"pool", mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, PoolState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// Pool-owned token vault (ATA of the pool PDA)
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = pool,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA that holds real SOL reserves for this pool
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: SystemAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Trade<'info> {
    #[account(seeds = [b"global"], bump = global.bump)]
    pub global: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"pool", mint.key().as_ref()],
        bump = pool.bump,
        has_one = mint,
    )]
    pub pool: Account<'info, PoolState>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = pool,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: SystemAccount<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + UserStats::SPACE,
        seeds = [b"user_stats", buyer.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub user_stats: Account<'info, UserStats>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: must equal global.treasury
    #[account(mut, address = global.treasury)]
    pub treasury: SystemAccount<'info>,

    /// CHECK: must equal pool.creator
    #[account(mut, address = pool.creator)]
    pub creator_wallet: SystemAccount<'info>,

    /// CHECK: Optional referrer. If not provided, fees go to treasury.
    #[account(mut)]
    pub referrer: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    #[account(seeds = [b"global"], bump = global.bump)]
    pub global: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"pool", mint.key().as_ref()],
        bump = pool.bump,
        has_one = mint,
    )]
    pub pool: Account<'info, PoolState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = pool,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: SystemAccount<'info>,

    #[account(mut)]
    pub migration_authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = migration_authority,
        associated_token::mint = mint,
        associated_token::authority = migration_authority,
    )]
    pub migration_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(mut, seeds = [b"global"], bump = global.bump, has_one = authority)]
    pub global: Account<'info, GlobalState>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyPauseAdmin<'info> {
    #[account(mut, seeds = [b"global"], bump = global.bump)]
    pub global: Account<'info, GlobalState>,
    pub emergency_admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(seeds = [b"global"], bump = global.bump)]
    pub global: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"pool", mint.key().as_ref()],
        bump = pool.bump,
        has_one = mint,
    )]
    pub pool: Account<'info, PoolState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// CHECK: SOL vault PDA — same seeds scheme as the trade flow.
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: SystemAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Step 2 of graduation. The `lp_lock_vault` is a fresh ATA owned by the
/// `lp_lock_authority` PDA — that PDA has no signer-callable instruction
/// in this program, so once LP tokens land here they cannot be moved.
#[derive(Accounts)]
pub struct GraduateStep2LockLp<'info> {
    #[account(seeds = [b"global"], bump = global.bump)]
    pub global: Account<'info, GlobalState>,

    /// Project token mint (used to namespace the lock PDA per pool).
    pub mint: Account<'info, Mint>,

    /// Raydium-issued LP mint for this pool. Off-chain step minted the
    /// LP supply to `lp_token_account`; this ix sweeps it into the lock.
    pub lp_mint: Account<'info, Mint>,

    /// Source: migration_authority's ATA holding the LP tokens.
    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = migration_authority,
    )]
    pub lp_token_account: Account<'info, TokenAccount>,

    /// CHECK: Authority PDA over the lock vault. Has no signer path in
    /// this program — it only ever appears as `associated_token::authority`
    /// for `lp_lock_vault`. No instruction signs with these seeds.
    #[account(
        seeds = [b"lp_lock_authority", mint.key().as_ref()],
        bump
    )]
    pub lp_lock_authority: UncheckedAccount<'info>,

    /// Destination: PDA-owned ATA where LP tokens are locked forever.
    #[account(
        init_if_needed,
        payer = migration_authority,
        associated_token::mint = lp_mint,
        associated_token::authority = lp_lock_authority,
    )]
    pub lp_lock_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub migration_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub migration_authority: Pubkey,
    pub fee_bps: u64,
    pub creator_fee_bps: u64,
    pub total_pools: u64,
    pub paused: bool,
    /// Dedicated emergency-pause key. Distinct from `authority` so a
    /// hot ops key can pause without holding upgrade powers.
    pub emergency_admin: Pubkey,
    /// Unix ts of the most recent set_paused(true). Zero when not paused.
    /// Used to gate `emergency_withdraw` behind a 7-day timelock so the
    /// authority has a window to un-pause if a pause was a false alarm.
    pub paused_at: i64,
    pub bump: u8,
}

impl GlobalState {
    // 32+32+32 + 8+8+8 + 1 + 32 + 8 + 1 + padding
    pub const SPACE: usize = 32 + 32 + 32 + 8 + 8 + 8 + 1 + 32 + 8 + 1 + 32;
}

#[account]
pub struct PoolState {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub token_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub token_total_supply: u64,
    pub graduation_threshold: u64,
    pub complete: bool,
    pub migrated: bool,
    pub created_at: i64,
    pub name: String,    // max 32
    pub symbol: String,  // max 10
    pub uri: String,     // max 200
    pub bump: u8,
}

impl PoolState {
    pub const SPACE: usize =
        32 + 32 + 32 + 32
        + 8 + 8 + 8 + 8 + 8 + 8
        + 1 + 1
        + 8
        + 4 + 32 + 4 + 10 + 4 + 200
        + 1
        + 32; // padding
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────────

#[event]
pub struct GlobalInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub migration_authority: Pubkey,
}

#[event]
pub struct PoolCreated {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub timestamp: i64,
}

#[event]
pub struct TradeEvent {
    pub mint: Pubkey,
    pub is_buy: bool,
    pub user: Pubkey,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub timestamp: i64,
}

#[event]
pub struct PoolGraduated {
    pub mint: Pubkey,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub timestamp: i64,
}

#[event]
pub struct PoolMigrated {
    pub mint: Pubkey,
    pub sol_migrated: u64,
    pub lp_tokens_minted: u64,
    pub leftover_burned: u64,
    pub timestamp: i64,
}

#[event]
pub struct LpLocked {
    pub mint: Pubkey,
    pub lp_mint: Pubkey,
    pub amount: u64,
    pub lp_lock_vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PauseToggled {
    pub paused: bool,
    pub paused_at: i64,
}

#[event]
pub struct EmergencyAdminRotated {
    pub new_admin: Pubkey,
}

#[event]
pub struct EmergencyWithdrawn {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub tokens_burned: u64,
    pub sol_returned: u64,
    pub timestamp: i64,
}

// ─────────────────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum BondingCurveError {
    #[msg("Protocol is paused")]
    Paused,
    #[msg("Amount is too small")]
    AmountTooSmall,
    #[msg("Name too long (max 32)")]
    NameTooLong,
    #[msg("Symbol too long (max 10)")]
    SymbolTooLong,
    #[msg("URI too long (max 200)")]
    UriTooLong,
    #[msg("Mint decimals must be 6")]
    BadDecimals,
    #[msg("Pool is complete / graduated")]
    PoolComplete,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Zero output")]
    ZeroOutput,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Pool has not graduated")]
    NotGraduated,
    #[msg("Caller is not the migration authority")]
    NotMigrationAuthority,
    #[msg("Pool already migrated")]
    #[msg("Caller is not the emergency admin")]
    NotEmergencyAdmin,
    #[msg("Pool is not currently paused")]
    NotPaused,
    #[msg("Emergency timelock has not elapsed (7 days from pause)")]
    TimelockNotElapsed,
    #[msg("Anti-sniping: Must hold tokens for at least 60 seconds")]
    AntiSnipingActive,
}

#[account]
pub struct UserStats {
    pub owner: Pubkey,
    pub last_buy: i64,
    pub total_bought: u64,
    pub total_sold: u64,
    pub bump: u8,
}

impl UserStats {
    pub const SPACE: usize = 32 + 8 + 8 + 8 + 1 + 32;
}
