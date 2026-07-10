//! # $RDX Presale Contract — Fair Launch System
//!
//! A fair presale that accumulates SOL for liquidity, with anti-whale
//! protections and merit-based airdrop integration.
//!
//! ┌────────────────────────────────────────────────────────────┐
//! │              FAIR PRESALE DESIGN                           │
//! │                                                            │
//! │  Phase 1: EARLY BIRD (first 24h)                          │
//! │  └─ Price: 0.001 SOL per 1000 RDX (50% discount)          │
//! │  └─ Max per wallet: 5 SOL                                  │
//! │  └─ Vesting: 30-day cliff, 60-day linear                   │
//! │                                                            │
//! │  Phase 2: PUBLIC (after 24h, until cap)                   │
//! │  └─ Price: 0.002 SOL per 1000 RDX                         │
//! │  └─ Max per wallet: 2 SOL                                  │
//! │  └─ Vesting: 14-day cliff, 30-day linear                   │
//! │                                                            │
//! │  Phase 3: AIRDROP (concurrent with presale)               │
//! │  └─ Free allocation based on merit/activity                │
//! │  └─ Telegram users, doc submitters, verifiers              │
//! │  └─ No vesting — immediate claim                           │
//! │                                                            │
//! │  Phase 4: LIQUIDITY LAUNCH (after presale ends)           │
//! │  └─ 100% of raised SOL → Raydium LP                       │
//! │  └─ LP tokens burned forever                               │
//! │  └─ Remaining RDX → staking pool                           │
//! │                                                            │
//! │  ANTI-WHALE:                                               │
//! │  └─ Max purchase caps per phase                            │
//! │  └─ Progressive pricing (early = cheaper)                  │
//! │  └─ Merit bonus for active community members               │
//! │                                                            │
//! │  PERPETUAL MECHANICS:                                      │
//! │  └─ 10% of presale SOL → burn wallet (RDX buyback+burn)   │
//! │  └─ 5% of presale SOL → community treasury                 │
//! │  └─ 85% of presale SOL → liquidity pool                    │
//! │  └─ After launch: 10% of fees burned quarterly             │
//! └────────────────────────────────────────────────────────────┘

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, Transfer as TokenTransfer, transfer as token_transfer};

declare_id!("G9S1MoLtomKPSmPk9PZVEAi1vbB3vCzzpMhPZGTVHNYc");

// ───────────────────────────────────────────────────────────────
// CONSTANTS
// ───────────────────────────────────────────────────────────────

/// Presale price: 0.001 SOL per 1000 RDX (early bird)
pub const EARLY_BIRD_PRICE_LAMPORTS: u64 = 1_000_000; // 0.001 SOL
pub const EARLY_BIRD_RDX_AMOUNT: u64 = 1_000_000_000_000; // 1000 RDX (9 decimals)

/// Presale price: 0.002 SOL per 1000 RDX (public)
pub const PUBLIC_PRICE_LAMPORTS: u64 = 2_000_000; // 0.002 SOL

/// Max purchase per wallet per phase
pub const EARLY_BIRD_MAX_SOL: u64 = 5_000_000_000; // 5 SOL
pub const PUBLIC_MAX_SOL: u64 = 2_000_000_000; // 2 SOL

/// Presale duration: 7 days (in seconds)
pub const PRESALE_DURATION_SECS: i64 = 7 * 24 * 3600;

/// Early bird phase: first 24 hours
pub const EARLY_BIRD_DURATION_SECS: i64 = 24 * 3600;

/// SOL distribution after presale
pub const LIQUIDITY_PCT: u64 = 8500; // 85%
pub const BURN_PCT: u64 = 1000;      // 10%
pub const TREASURY_PCT: u64 = 500;   // 5%

// ───────────────────────────────────────────────────────────────
// PROGRAM
// ───────────────────────────────────────────────────────────────

#[program]
pub mod rd_presale {
    use super::*;

    /// Initialize the presale. Authority sets the token mint and start time.
    /// `soft_cap` (lamports) gates whether buyers can claim refunds if the
    /// presale ends below target. Pass 0 to disable refund path entirely.
    pub fn initialize(
        ctx: Context<Initialize>,
        rdx_per_sol: u64,
        soft_cap: u64,
    ) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        presale.authority = ctx.accounts.authority.key();
        presale.rdx_token_mint = ctx.accounts.rdx_token_mint.key();
        presale.start_time = Clock::get()?.unix_timestamp;
        presale.end_time = presale.start_time + PRESALE_DURATION_SECS;
        presale.total_sol_raised = 0;
        presale.total_rdx_allocated = 0;
        presale.total_participants = 0;
        presale.is_active = true;
        presale.is_launched = false;
        presale.rdx_per_sol_early = rdx_per_sol;
        presale.rdx_per_sol_public = rdx_per_sol / 2; // Public gets half the RDX per SOL
        presale.soft_cap = soft_cap;
        presale.bump = ctx.bumps.presale;
        
        emit!(PresaleInitialized {
            authority: presale.authority,
            start_time: presale.start_time,
            end_time: presale.end_time,
            rdx_per_sol_early: presale.rdx_per_sol_early,
            rdx_per_sol_public: presale.rdx_per_sol_public,
        });
        
        Ok(())
    }

    /// Buy RDX in the presale. Price depends on phase (early bird vs public).
    pub fn buy(ctx: Context<Buy>, sol_amount: u64) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        require!(presale.is_active, PresaleError::PresaleNotActive);
        require!(presale.is_launched == false, PresaleError::PresaleAlreadyLaunched);
        
        let now = Clock::get()?.unix_timestamp;
        require!(now >= presale.start_time, PresaleError::PresaleNotStarted);
        require!(now <= presale.end_time, PresaleError::PresaleEnded);
        
        // Determine phase and validate
        let time_in_presale = now - presale.start_time;
        let is_early_bird = time_in_presale < EARLY_BIRD_DURATION_SECS;
        
        // Anti-whale: check max purchase
        let buyer = &mut ctx.accounts.buyer_stats;
        let max_allowed = if is_early_bird { EARLY_BIRD_MAX_SOL } else { PUBLIC_MAX_SOL };
        require!(
            buyer.total_sol_contributed.saturating_add(sol_amount) <= max_allowed,
            PresaleError::ExceedsMaxPurchase
        );
        require!(sol_amount >= 100_000_000, PresaleError::BelowMinimumPurchase); // Min 0.1 SOL

        // Calculate RDX amount based on phase
        let rdx_per_sol = if is_early_bird { presale.rdx_per_sol_early } else { presale.rdx_per_sol_public };
        let rdx_amount = (sol_amount as u128 * rdx_per_sol as u128 / 1_000_000_000) as u64;
        require!(rdx_amount > 0, PresaleError::CalculationError);

        // Transfer SOL from buyer to presale vault
        let transfer_lamports_instruction = anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer_account.to_account_info(),
            to: ctx.accounts.presale_vault.to_account_info(),
        };
        let transfer_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_lamports_instruction,
        );
        anchor_lang::system_program::transfer(transfer_context, sol_amount)?;

        // Update presale stats
        presale.total_sol_raised = presale.total_sol_raised.saturating_add(sol_amount);
        presale.total_rdx_allocated = presale.total_rdx_allocated.saturating_add(rdx_amount);
        
        // Update buyer stats
        buyer.total_sol_contributed = buyer.total_sol_contributed.saturating_add(sol_amount);
        buyer.rdx_allocated = buyer.rdx_allocated.saturating_add(rdx_amount);
        buyer.claimed = false;
        buyer.claimed_amount = 0;
        buyer.claim_time = now;
        // Stamp the phase the buyer entered in. Once true, never flipped to
        // false on subsequent buys (early-bird buyers retain the longer
        // vesting cliff for their whole allocation, matching the docstring
        // phase model). New buyers in the public phase get is_early_bird=false.
        if buyer.total_sol_contributed == sol_amount {
            // First-ever buy: take the current phase verbatim.
            buyer.is_early_bird = is_early_bird;
        } else {
            // Subsequent buy: keep is_early_bird true if it ever was true.
            buyer.is_early_bird = buyer.is_early_bird || is_early_bird;
        }
        
        // Track new participants
        if buyer.total_sol_contributed == sol_amount {
            presale.total_participants = presale.total_participants.saturating_add(1);
        }

        emit!(TokensPurchased {
            buyer: ctx.accounts.buyer.key(),
            sol_amount,
            rdx_amount,
            is_early_bird,
        });

        Ok(())
    }

    /// Claim RDX tokens after presale ends and tokens are distributed.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let presale = &ctx.accounts.presale;
        let buyer = &mut ctx.accounts.buyer_stats;
        
        let now = Clock::get()?.unix_timestamp;
        
        // Autonomous check: Allow claim if launched OR if presale ended 7 days ago (failsafe)
        require!(
            presale.is_launched || now > presale.end_time + (7 * 24 * 3600), 
            PresaleError::TokensNotYetDistributed
        );
        
        require!(!buyer.claimed, PresaleError::AlreadyClaimed);
        require!(buyer.rdx_allocated > 0, PresaleError::NoTokensToClaim);
        
        // Check vesting
        let now = Clock::get()?.unix_timestamp;
        let presale_end = presale.end_time;
        
        // 30% TGE (immediate after launch)
        // 70% Linear over 12 months
        let total_amount = buyer.rdx_allocated;
        let tge_amount = total_amount.checked_mul(3000).unwrap() / 10000;
        let vesting_amount = total_amount.checked_sub(tge_amount).unwrap();
        
        let months_12_secs: i64 = 365 * 24 * 3600;
        let vested_so_far = if now <= presale_end {
            0
        } else if now >= presale_end + months_12_secs {
            vesting_amount
        } else {
            let elapsed = now - presale_end;
            (vesting_amount as u128 * elapsed as u128 / months_12_secs as u128) as u64
        };

        let total_releasable = tge_amount.checked_add(vested_so_far).unwrap();
        let already_claimed = buyer.claimed_amount; // Need to add this field to BuyerStats
        let to_claim = total_releasable.checked_sub(already_claimed).unwrap();
        
        require!(to_claim > 0, PresaleError::NothingToClaim);

        // Update state
        buyer.claimed_amount = buyer.claimed_amount.checked_add(to_claim).unwrap();
        if buyer.claimed_amount == total_amount {
            buyer.claimed = true;
        }
        buyer.claimed_at = now;

        emit!(TokensClaimed {
            buyer: ctx.accounts.buyer.key(),
            rdx_amount: to_claim,
        });

        // Transfer RDX tokens to buyer
        let presale_bump = ctx.accounts.presale.bump;
        let seeds = &[b"presale".as_ref(), &[presale_bump]];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = TokenTransfer {
            from: ctx.accounts.presale_token_vault.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.presale.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token_transfer(cpi_ctx, to_claim)?;

        Ok(())
    }

    /// Launch: Distribute raised SOL to liquidity, burn, and treasury.
    /// Only callable by authority after presale ends.
    pub fn launch(ctx: Context<Launch>) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        require!(presale.is_active, PresaleError::PresaleNotActive);
        require!(!presale.is_launched, PresaleError::PresaleAlreadyLaunched);
        
        let now = Clock::get()?.unix_timestamp;
        require!(now >= presale.end_time, PresaleError::PresaleStillActive);
        require!(presale.total_sol_raised > 0, PresaleError::NoSolRaised);

        // Mark as launched
        presale.is_launched = true;

        // Calculate SOL distribution
        let total_sol = presale.total_sol_raised;
        let liquidity_sol = total_sol * LIQUIDITY_PCT / 10000;
        let burn_sol = total_sol * BURN_PCT / 10000;
        let treasury_sol = total_sol * TREASURY_PCT / 10000;

        emit!(PresaleLaunched {
            total_sol_raised: total_sol,
            liquidity_sol,
            burn_sol,
            treasury_sol,
            total_participants: presale.total_participants,
        });

        // Transfer SOL to respective accounts. Sign with the presale_vault
        // PDA (NOT the presale state PDA) — the SOL lives in the vault, so
        // the vault is the from-authority. Seeds match the vault's
        // declaration in `Launch::presale_vault` below: [b"presale_vault"].
        let vault_bump = ctx.bumps.presale_vault;
        let seeds: &[&[u8]] = &[b"presale_vault".as_ref(), &[vault_bump]];
        let signer = &[seeds];

        // Transfer to liquidity
        let liquidity_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.presale_vault.to_account_info(),
                to: ctx.accounts.liquidity_recipient.to_account_info(),
            },
            signer,
        );
        anchor_lang::system_program::transfer(liquidity_ctx, liquidity_sol)?;

        // Transfer to burn
        let burn_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.presale_vault.to_account_info(),
                to: ctx.accounts.burn_wallet.to_account_info(),
            },
            signer,
        );
        anchor_lang::system_program::transfer(burn_ctx, burn_sol)?;

        // Transfer to treasury
        let treasury_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.presale_vault.to_account_info(),
                to: ctx.accounts.treasury_recipient.to_account_info(),
            },
            signer,
        );
        anchor_lang::system_program::transfer(treasury_ctx, treasury_sol)?;

        Ok(())
    }

    /// Claim a refund of the SOL contributed by `buyer` if the presale ended
    /// without reaching `soft_cap` and was not launched. Idempotent: once a
    /// buyer has refunded their `total_sol_contributed`, the `refunded` flag
    /// is set and further calls fail with `AlreadyRefunded`.
    ///
    /// Pre-conditions enforced:
    ///  * `now > presale.end_time`              — presale window has closed.
    ///  * `presale.total_sol_raised < soft_cap` — soft cap missed.
    ///  * `!presale.is_launched`                — `launch` has NOT executed
    ///                                            (mutually exclusive paths).
    ///  * `buyer_stats.total_sol_contributed > 0` — buyer actually contributed.
    ///  * `!buyer_stats.refunded`               — no double-refund.
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let presale = &ctx.accounts.presale;
        let buyer_stats = &mut ctx.accounts.buyer_stats;

        let now = Clock::get()?.unix_timestamp;
        require!(now > presale.end_time, PresaleError::PresaleStillActive);
        require!(!presale.is_launched, PresaleError::RefundNotAvailable);
        require!(presale.soft_cap > 0, PresaleError::RefundNotAvailable);
        require!(
            presale.total_sol_raised < presale.soft_cap,
            PresaleError::RefundNotAvailable
        );
        require!(!buyer_stats.refunded, PresaleError::AlreadyRefunded);
        require!(!buyer_stats.claimed, PresaleError::AlreadyClaimed);
        let refund_lamports = buyer_stats.total_sol_contributed;
        require!(refund_lamports > 0, PresaleError::NothingToRefund);

        // Vault PDA must hold enough lamports (sanity — should always hold,
        // since launch path is excluded by !is_launched).
        let vault_lamports = ctx.accounts.presale_vault.to_account_info().lamports();
        require!(refund_lamports <= vault_lamports, PresaleError::InsufficientVault);

        // Mark refunded BEFORE the CPI so a re-entrant call (or a logic
        // error in a future sibling instruction) cannot drain twice.
        buyer_stats.refunded = true;

        let vault_bump = ctx.bumps.presale_vault;
        let seeds: &[&[u8]] = &[b"presale_vault".as_ref(), &[vault_bump]];
        let signer = &[seeds];

        let refund_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.presale_vault.to_account_info(),
                to: ctx.accounts.buyer.to_account_info(),
            },
            signer,
        );
        anchor_lang::system_program::transfer(refund_ctx, refund_lamports)?;

        emit!(RefundClaimed {
            buyer: ctx.accounts.buyer.key(),
            sol_amount: refund_lamports,
        });

        Ok(())
    }

    /// Emergency pause — only authority can pause the presale.
    pub fn pause(ctx: Context<AdminAction>) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        presale.is_active = false;
        
        emit!(PresalePaused {
            authority: ctx.accounts.authority.key(),
            total_sol_raised: presale.total_sol_raised,
        });
        Ok(())
    }

    /// Resume presale after pause.
    pub fn resume(ctx: Context<AdminAction>) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        presale.is_active = true;
        Ok(())
    }
}

// ───────────────────────────────────────────────────────────────
// ACCOUNTS
// ───────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + 256,
        seeds = [b"presale"],
        bump
    )]
    pub presale: Account<'info, PresaleState>,
    /// The RDX token mint
    pub rdx_token_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Presale state account
    #[account(mut, seeds = [b"presale"], bump = presale.bump)]
    pub presale: Account<'info, PresaleState>,
    /// CHECK: Presale SOL vault
    #[account(mut, seeds = [b"presale_vault"], bump)]
    pub presale_vault: SystemAccount<'info>,
    #[account(mut)]
    pub buyer_account: Signer<'info>,
    /// BUYER stats tracking
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + 128,
        seeds = [b"presale_buyer", buyer.key().as_ref()],
        bump
    )]
    pub buyer_stats: Account<'info, BuyerStats>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"presale"], bump = presale.bump)]
    pub presale: Account<'info, PresaleState>,
    #[account(
        mut,
        seeds = [b"presale_buyer", buyer.key().as_ref()],
        bump
    )]
    pub buyer_stats: Account<'info, BuyerStats>,
    #[account(mut)]
    pub presale_token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Launch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"presale"],
        bump = presale.bump,
        constraint = presale.authority == authority.key() @ PresaleError::NotAuthority
    )]
    pub presale: Account<'info, PresaleState>,
    /// CHECK: Presale SOL vault
    #[account(mut, seeds = [b"presale_vault"], bump)]
    pub presale_vault: SystemAccount<'info>,
    /// CHECK: Liquidity recipient
    #[account(mut)]
    pub liquidity_recipient: AccountInfo<'info>,
    /// CHECK: Burn wallet
    #[account(mut)]
    pub burn_wallet: AccountInfo<'info>,
    /// CHECK: Treasury recipient
    #[account(mut)]
    pub treasury_recipient: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"presale"], bump = presale.bump)]
    pub presale: Account<'info, PresaleState>,
    /// CHECK: Presale SOL vault PDA — drained back to the buyer on refund.
    #[account(mut, seeds = [b"presale_vault"], bump)]
    pub presale_vault: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [b"presale_buyer", buyer.key().as_ref()],
        bump
    )]
    pub buyer_stats: Account<'info, BuyerStats>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"presale"],
        bump = presale.bump,
        constraint = presale.authority == authority.key() @ PresaleError::NotAuthority
    )]
    pub presale: Account<'info, PresaleState>,
}

// ───────────────────────────────────────────────────────────────
// STATE
// ───────────────────────────────────────────────────────────────

#[account]
pub struct PresaleState {
    pub authority: Pubkey,
    pub rdx_token_mint: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub total_sol_raised: u64,
    pub total_rdx_allocated: u64,
    pub total_participants: u64,
    pub is_active: bool,
    pub is_launched: bool,
    pub rdx_per_sol_early: u64,
    pub rdx_per_sol_public: u64,
    pub bump: u8,
    /// Soft cap in lamports. If `total_sol_raised < soft_cap` at end_time and
    /// `is_launched == false`, buyers may invoke `claim_refund` to recover
    /// their contribution. A value of 0 disables the refund path.
    pub soft_cap: u64,
}

#[account]
pub struct BuyerStats {
    pub buyer: Pubkey,
    pub total_sol_contributed: u64,
    pub rdx_allocated: u64,
    pub claimed: bool,
    pub claimed_amount: u64,
    pub claim_time: i64,
    pub claimed_at: i64,
    pub is_early_bird: bool,
    /// Set to true after a successful `claim_refund`. Mutually exclusive with
    /// `claimed` (a buyer either claims tokens after launch OR claims refund
    /// after a failed presale).
    pub refunded: bool,
}

// ───────────────────────────────────────────────────────────────
// EVENTS
// ───────────────────────────────────────────────────────────────

#[event]
pub struct PresaleInitialized {
    pub authority: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub rdx_per_sol_early: u64,
    pub rdx_per_sol_public: u64,
}

#[event]
pub struct TokensPurchased {
    pub buyer: Pubkey,
    pub sol_amount: u64,
    pub rdx_amount: u64,
    pub is_early_bird: bool,
}

#[event]
pub struct TokensClaimed {
    pub buyer: Pubkey,
    pub rdx_amount: u64,
}

#[event]
pub struct PresaleLaunched {
    pub total_sol_raised: u64,
    pub liquidity_sol: u64,
    pub burn_sol: u64,
    pub treasury_sol: u64,
    pub total_participants: u64,
}

#[event]
pub struct PresalePaused {
    pub authority: Pubkey,
    pub total_sol_raised: u64,
}

#[event]
pub struct RefundClaimed {
    pub buyer: Pubkey,
    pub sol_amount: u64,
}

// ───────────────────────────────────────────────────────────────
// ERRORS
// ───────────────────────────────────────────────────────────────

#[error_code]
pub enum PresaleError {
    #[msg("Presale is not active")]
    PresaleNotActive,
    #[msg("Presale has already launched")]
    PresaleAlreadyLaunched,
    #[msg("Presale has not started yet")]
    PresaleNotStarted,
    #[msg("Presale has ended")]
    PresaleEnded,
    #[msg("Purchase exceeds maximum allowed")]
    ExceedsMaxPurchase,
    #[msg("Below minimum purchase amount (0.1 SOL)")]
    BelowMinimumPurchase,
    #[msg("Calculation error")]
    CalculationError,
    #[msg("Tokens not yet distributed")]
    TokensNotYetDistributed,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("No tokens to claim")]
    NoTokensToClaim,
    #[msg("Vesting cliff not yet reached")]
    VestingCliffNotReached,
    #[msg("Presale still active")]
    PresaleStillActive,
    #[msg("No SOL raised")]
    NoSolRaised,
    #[msg("Not authority")]
    NotAuthority,
    #[msg("Refund not available (presale launched, soft-cap met, or refund disabled)")]
    RefundNotAvailable,
    #[msg("Buyer already refunded")]
    AlreadyRefunded,
    #[msg("Nothing to refund (no contribution recorded)")]
    NothingToRefund,
    #[msg("Vault has insufficient lamports for refund")]
    InsufficientVault,
}
