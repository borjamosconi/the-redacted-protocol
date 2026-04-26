//! RDX Rewards Program — Distribute $RDX for fragment contributions.
//!
//! Rewards are distributed for:
//! - Submitting redacted documents
//! - Verifying reconstructions
//! - Publishing declassified fragments
//!
//! Replay protection: every reward dispatch creates a per-(fragment, user,
//! reward_type) RewardRecord PDA via `init`, so a duplicate call fails at
//! account creation. Reward types are encoded as a literal byte in the PDA
//! seed (one Accounts struct per type so seeds stay statically known).

use anchor_lang::prelude::*;

declare_id!("XhodEAbfkn1GJ37pimGBdUJwgM5aXqfDZ9FAMBPxecg");

/// Stable reward-type discriminants used in the RewardRecord PDA seed.
/// NEVER renumber — these bytes are baked into existing PDAs.
pub const REWARD_TYPE_DOCUMENT: u8 = 0;
pub const REWARD_TYPE_VERIFY: u8 = 1;
pub const REWARD_TYPE_PUBLISH: u8 = 2;
pub const REWARD_TYPE_REFERRAL: u8 = 3;

#[program]
pub mod rd_rewards {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, reward_vault: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.reward_config;
        config.authority = ctx.accounts.authority.key();
        config.reward_mint = ctx.accounts.reward_mint.key();
        config.reward_vault = reward_vault;
        config.total_distributed = 0;
        config.total_claimed = 0;
        config.document_reward = 100_000_000_000;      // 100 RDX
        config.verify_reward = 50_000_000_000;          // 50 RDX
        config.publish_reward = 25_000_000_000;         // 25 RDX
        config.referral_reward = 50_000_000_000;        // 50 RDX
        config.bump = ctx.bumps.reward_config;
        Ok(())
    }

    pub fn update_rewards(ctx: Context<UpdateRewards>,
        doc: Option<u64>, verify: Option<u64>, publish: Option<u64>, referral: Option<u64>
    ) -> Result<()> {
        let config = &mut ctx.accounts.reward_config;
        if let Some(v) = doc { config.document_reward = v; }
        if let Some(v) = verify { config.verify_reward = v; }
        if let Some(v) = publish { config.publish_reward = v; }
        if let Some(v) = referral { config.referral_reward = v; }
        Ok(())
    }

    pub fn reward_document(ctx: Context<DistributeRewardDocument>, fragment_hash: [u8; 32]) -> Result<()> {
        let amount = ctx.accounts.reward_config.document_reward;
        let now = Clock::get()?.unix_timestamp;

        // Stamp the replay-protection record (init enforces uniqueness).
        let record = &mut ctx.accounts.reward_record;
        record.fragment_hash = fragment_hash;
        record.user = ctx.accounts.signer.key();
        record.reward_type = REWARD_TYPE_DOCUMENT;
        record.amount = amount;
        record.claimed_at = now;

        transfer_from_vault(
            &ctx.accounts.reward_config,
            &ctx.accounts.reward_vault,
            &ctx.accounts.user_reward_account,
            &ctx.accounts.token_program,
            amount,
        )?;
        bump_total_distributed(&mut ctx.accounts.reward_config, amount)?;

        emit!(DocumentRewarded {
            user: ctx.accounts.signer.key(),
            fragment_hash,
            amount,
        });
        Ok(())
    }

    pub fn reward_verify(ctx: Context<DistributeRewardVerify>, fragment_hash: [u8; 32]) -> Result<()> {
        let amount = ctx.accounts.reward_config.verify_reward;
        let now = Clock::get()?.unix_timestamp;

        let record = &mut ctx.accounts.reward_record;
        record.fragment_hash = fragment_hash;
        record.user = ctx.accounts.signer.key();
        record.reward_type = REWARD_TYPE_VERIFY;
        record.amount = amount;
        record.claimed_at = now;

        transfer_from_vault(
            &ctx.accounts.reward_config,
            &ctx.accounts.reward_vault,
            &ctx.accounts.user_reward_account,
            &ctx.accounts.token_program,
            amount,
        )?;
        bump_total_distributed(&mut ctx.accounts.reward_config, amount)?;

        emit!(VerifyRewarded {
            user: ctx.accounts.signer.key(),
            fragment_hash,
            amount,
        });
        Ok(())
    }

    pub fn reward_publish(ctx: Context<DistributeRewardPublish>, fragment_hash: [u8; 32]) -> Result<()> {
        let amount = ctx.accounts.reward_config.publish_reward;
        let now = Clock::get()?.unix_timestamp;

        let record = &mut ctx.accounts.reward_record;
        record.fragment_hash = fragment_hash;
        record.user = ctx.accounts.signer.key();
        record.reward_type = REWARD_TYPE_PUBLISH;
        record.amount = amount;
        record.claimed_at = now;

        transfer_from_vault(
            &ctx.accounts.reward_config,
            &ctx.accounts.reward_vault,
            &ctx.accounts.user_reward_account,
            &ctx.accounts.token_program,
            amount,
        )?;
        bump_total_distributed(&mut ctx.accounts.reward_config, amount)?;

        emit!(PublishRewarded {
            user: ctx.accounts.signer.key(),
            fragment_hash,
            amount,
        });
        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

fn transfer_from_vault<'info>(
    reward_config: &Account<'info, RewardConfig>,
    reward_vault: &Account<'info, anchor_spl::token::TokenAccount>,
    user_reward_account: &Account<'info, anchor_spl::token::TokenAccount>,
    token_program: &Program<'info, anchor_spl::token::Token>,
    amount: u64,
) -> Result<()> {
    let config_bump = reward_config.bump;
    let seeds = &[b"reward_config".as_ref(), &[config_bump]];
    let signer = &[&seeds[..]];
    let cpi_accounts = anchor_spl::token::Transfer {
        from: reward_vault.to_account_info(),
        to: user_reward_account.to_account_info(),
        authority: reward_config.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    anchor_spl::token::transfer(cpi_ctx, amount)
}

fn bump_total_distributed(config: &mut Account<'_, RewardConfig>, amount: u64) -> Result<()> {
    config.total_distributed = config
        .total_distributed
        .checked_add(amount)
        .ok_or(RewardsError::Overflow)?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + RewardConfig::SPACE,
        seeds = [b"reward_config"],
        bump
    )]
    pub reward_config: Account<'info, RewardConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: stored as a Pubkey on the config; not deserialized here.
    pub reward_mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRewards<'info> {
    #[account(mut, has_one = authority)]
    pub reward_config: Account<'info, RewardConfig>,
    pub authority: Signer<'info>,
}

// One Accounts struct per reward type so the discriminant byte is a static
// part of the seed and `init` can enforce uniqueness deterministically.

#[derive(Accounts)]
#[instruction(fragment_hash: [u8; 32])]
pub struct DistributeRewardDocument<'info> {
    #[account(mut, seeds = [b"reward_config"], bump = reward_config.bump)]
    pub reward_config: Account<'info, RewardConfig>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub reward_vault: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(mut)]
    pub user_reward_account: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(
        init,
        payer = signer,
        space = 8 + RewardRecord::SPACE,
        seeds = [b"reward", fragment_hash.as_ref(), signer.key().as_ref(), &[REWARD_TYPE_DOCUMENT]],
        bump,
    )]
    pub reward_record: Account<'info, RewardRecord>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(fragment_hash: [u8; 32])]
pub struct DistributeRewardVerify<'info> {
    #[account(mut, seeds = [b"reward_config"], bump = reward_config.bump)]
    pub reward_config: Account<'info, RewardConfig>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub reward_vault: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(mut)]
    pub user_reward_account: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(
        init,
        payer = signer,
        space = 8 + RewardRecord::SPACE,
        seeds = [b"reward", fragment_hash.as_ref(), signer.key().as_ref(), &[REWARD_TYPE_VERIFY]],
        bump,
    )]
    pub reward_record: Account<'info, RewardRecord>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(fragment_hash: [u8; 32])]
pub struct DistributeRewardPublish<'info> {
    #[account(mut, seeds = [b"reward_config"], bump = reward_config.bump)]
    pub reward_config: Account<'info, RewardConfig>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub reward_vault: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(mut)]
    pub user_reward_account: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(
        init,
        payer = signer,
        space = 8 + RewardRecord::SPACE,
        seeds = [b"reward", fragment_hash.as_ref(), signer.key().as_ref(), &[REWARD_TYPE_PUBLISH]],
        bump,
    )]
    pub reward_record: Account<'info, RewardRecord>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct RewardConfig {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_vault: Pubkey,
    pub total_distributed: u64,
    pub total_claimed: u64,
    pub document_reward: u64,
    pub verify_reward: u64,
    pub publish_reward: u64,
    pub referral_reward: u64,
    pub bump: u8,
}

impl RewardConfig {
    pub const SPACE: usize = 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct RewardRecord {
    pub fragment_hash: [u8; 32],
    pub user: Pubkey,
    pub reward_type: u8,
    pub amount: u64,
    pub claimed_at: i64,
}

impl RewardRecord {
    pub const SPACE: usize = 32 + 32 + 1 + 8 + 8 + 16; // padding
}

#[event]
pub struct DocumentRewarded { pub user: Pubkey, pub fragment_hash: [u8; 32], pub amount: u64 }
#[event]
pub struct VerifyRewarded { pub user: Pubkey, pub fragment_hash: [u8; 32], pub amount: u64 }
#[event]
pub struct PublishRewarded { pub user: Pubkey, pub fragment_hash: [u8; 32], pub amount: u64 }

#[error_code]
pub enum RewardsError {
    #[msg("Math overflow on bookkeeping counter")]
    Overflow,
}
