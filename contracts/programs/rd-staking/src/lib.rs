//! RDX Staking Program — Stake $RDX to earn protocol fees.
//!
//! Users stake RDX tokens and earn a share of protocol fees
//! proportional to their stake. Unstaking has a 7-day lock period.

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, transfer, Transfer};

declare_id!("B6exebxV6gLVy2J4djeNmULi56uniV9gkogeJfTEo6N9");

#[program]
pub mod rd_staking {
    use super::*;

    /// Initialize the staking pool.
    pub fn initialize(ctx: Context<Initialize>, reward_per_second: u64) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        pool.authority = ctx.accounts.authority.key();
        pool.staking_token_mint = ctx.accounts.staking_token_mint.key();
        pool.reward_token_mint = ctx.accounts.reward_token_mint.key();
        pool.total_staked = 0;
        pool.total_rewards_paid = 0;
        pool.reward_per_second = reward_per_second;
        pool.last_update = Clock::get()?.unix_timestamp;
        pool.bump = ctx.bumps.staking_pool;
        Ok(())
    }

    /// Stake RDX tokens.
    pub fn stake(ctx: Context<StakeTokens>, amount: u64) -> Result<()> {
        require!(amount >= 10_000_000_000, StakingError::BelowMinimum); // 10 RDX min

        // Transfer tokens from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.staking_vault.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, amount)?;

        // Create or update user stake record
        let stake = &mut ctx.accounts.stake_account;
        if stake.amount == 0 {
            stake.owner = ctx.accounts.signer.key();
            stake.pool = ctx.accounts.staking_pool.key();
            stake.staked_at = Clock::get()?.unix_timestamp;
            stake.bump = ctx.bumps.stake_account;
        }
        stake.amount = stake.amount.checked_add(amount).unwrap();
        stake.last_claim = Clock::get()?.unix_timestamp;

        // Update pool
        let pool = &mut ctx.accounts.staking_pool;
        pool.total_staked = pool.total_staked.checked_add(amount).unwrap();

        emit!(Staked {
            user: ctx.accounts.signer.key(),
            amount,
            total_staked: pool.total_staked,
        });

        Ok(())
    }

    /// Unstake RDX tokens (with lock period).
    pub fn unstake(ctx: Context<UnstakeTokens>, amount: u64) -> Result<()> {
        let stake = &mut ctx.accounts.stake_account;
        require!(stake.amount >= amount, StakingError::InsufficientStake);

        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= stake.staked_at + 7 * 24 * 3600, // 7 day lock
            StakingError::LockedPeriod
        );

        // Claim pending rewards first
        let pending = calculate_reward(stake, &ctx.accounts.staking_pool, now)?;
        if pending > 0 {
            let pool_bump = ctx.accounts.staking_pool.bump;
            let seeds = &[b"staking_pool".as_ref(), &[pool_bump]];
            let signer = &[&seeds[..]];
            let cpi_accounts = Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.user_reward_account.to_account_info(),
                authority: ctx.accounts.staking_pool.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            transfer(cpi_ctx, pending)?;
        }

        // Transfer tokens back to user
        let pool_bump = ctx.accounts.staking_pool.bump;
        let seeds = &[b"staking_pool".as_ref(), &[pool_bump]];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.staking_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.staking_pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer(cpi_ctx, amount)?;

        stake.amount = stake.amount.checked_sub(amount).unwrap();
        let pool = &mut ctx.accounts.staking_pool;
        pool.total_staked = pool.total_staked.checked_sub(amount).unwrap();

        emit!(Unstaked {
            user: ctx.accounts.signer.key(),
            amount,
            total_staked: pool.total_staked,
        });

        Ok(())
    }

    /// Claim pending rewards.
    pub fn claim(ctx: Context<ClaimRewards>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let pending = calculate_reward(&ctx.accounts.stake_account, &ctx.accounts.staking_pool, now)?;
        require!(pending > 0, StakingError::NoRewards);

        let pool_bump = ctx.accounts.staking_pool.bump;
        let seeds = &[b"staking_pool".as_ref(), &[pool_bump]];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: ctx.accounts.staking_pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer(cpi_ctx, pending)?;

        let stake = &mut ctx.accounts.stake_account;
        stake.last_claim = now;

        let pool = &mut ctx.accounts.staking_pool;
        pool.total_rewards_paid = pool.total_rewards_paid.checked_add(pending).unwrap();
        pool.last_update = now;

        emit!(RewardsClaimed {
            user: ctx.accounts.signer.key(),
            amount: pending,
        });

        Ok(())
    }
}

fn calculate_reward(stake: &StakeAccount, pool: &StakingPool, now: i64) -> Result<u64> {
    if stake.amount == 0 || pool.total_staked == 0 { return Ok(0); }
    let elapsed = (now - stake.last_claim) as u64;
    let user_share = (stake.amount as u128 * 10000 / pool.total_staked as u128) as u64;
    let reward = pool.reward_per_second.checked_mul(elapsed).unwrap()
        .checked_mul(user_share).unwrap() / 10000;
    Ok(reward)
}



// ── Accounts ─────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StakingPool::SPACE,
        seeds = [b"staking_pool"],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub staking_token_mint: AccountInfo<'info>,
    pub reward_token_mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + StakeAccount::SPACE,
        seeds = [b"stake", staking_pool.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub staking_vault: Account<'info, TokenAccount>,
    pub staking_token_mint: AccountInfo<'info>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeTokens<'info> {
    #[account(
        mut,
        seeds = [b"stake", staking_pool.key().as_ref(), signer.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.owner == signer.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub staking_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_reward_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"stake", staking_pool.key().as_ref(), signer.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.owner == signer.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_reward_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ── Data Structures ──────────────────────────────────────────────

#[account]
pub struct StakingPool {
    pub authority: Pubkey,
    pub staking_token_mint: Pubkey,
    pub reward_token_mint: Pubkey,
    pub total_staked: u64,
    pub total_rewards_paid: u64,
    pub reward_per_second: u64,
    pub last_update: i64,
    pub bump: u8,
}

impl StakingPool {
    pub const SPACE: usize = 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub staked_at: i64,
    pub last_claim: i64,
    pub bump: u8,
}

impl StakeAccount {
    pub const SPACE: usize = 32 + 32 + 8 + 8 + 8 + 1;
}

// ── Events ───────────────────────────────────────────────────────

#[event]
pub struct Staked {
    pub user: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
}

#[event]
pub struct Unstaked {
    pub user: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
}

#[event]
pub struct RewardsClaimed {
    pub user: Pubkey,
    pub amount: u64,
}

// ── Errors ───────────────────────────────────────────────────────

#[error_code]
pub enum StakingError {
    #[msg("Stake amount below minimum (10 RDX)")]
    BelowMinimum,
    #[msg("Insufficient staked balance")]
    InsufficientStake,
    #[msg("Tokens are in lock period (7 days)")]
    LockedPeriod,
    #[msg("No rewards to claim")]
    NoRewards,
}
