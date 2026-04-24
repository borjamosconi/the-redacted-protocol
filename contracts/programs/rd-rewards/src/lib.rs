//! RDX Rewards Program — Distribute $RDX for fragment contributions.
//!
//! Rewards are distributed for:
//! - Submitting redacted documents
//! - Verifying reconstructions
//! - Publishing declassified fragments

use anchor_lang::prelude::*;

declare_id!("XhodEAbfkn1GJ37pimGBdUJwgM5aXqfDZ9FAMBPxecg");

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

    pub fn reward_document(ctx: Context<DistributeReward>, fragment_hash: [u8; 32]) -> Result<()> {
        let amount = ctx.accounts.reward_config.document_reward;
        
        // Transfer from reward vault to user token account
        let config_bump = ctx.accounts.reward_config.bump;
        let seeds = &[b"reward_config".as_ref(), &[config_bump]];
        let signer = &[&seeds[..]];
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: ctx.accounts.reward_config.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        let config = &mut ctx.accounts.reward_config;
        config.total_distributed = config.total_distributed.checked_add(amount).unwrap();
        emit!(DocumentRewarded {
            user: ctx.accounts.signer.key(),
            fragment_hash,
            amount,
        });
        Ok(())
    }

    pub fn reward_verify(ctx: Context<DistributeReward>, fragment_hash: [u8; 32]) -> Result<()> {
        let amount = ctx.accounts.reward_config.verify_reward;

        // Transfer from reward vault to user token account
        let config_bump = ctx.accounts.reward_config.bump;
        let seeds = &[b"reward_config".as_ref(), &[config_bump]];
        let signer = &[&seeds[..]];
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: ctx.accounts.reward_config.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        let config = &mut ctx.accounts.reward_config;
        config.total_distributed = config.total_distributed.checked_add(amount).unwrap();
        emit!(VerifyRewarded {
            user: ctx.accounts.signer.key(),
            fragment_hash,
            amount,
        });
        Ok(())
    }

    pub fn reward_publish(ctx: Context<DistributeReward>, fragment_hash: [u8; 32]) -> Result<()> {
        let amount = ctx.accounts.reward_config.publish_reward;

        // Transfer from reward vault to user token account
        let config_bump = ctx.accounts.reward_config.bump;
        let seeds = &[b"reward_config".as_ref(), &[config_bump]];
        let signer = &[&seeds[..]];
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: ctx.accounts.reward_config.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        let config = &mut ctx.accounts.reward_config;
        config.total_distributed = config.total_distributed.checked_add(amount).unwrap();
        emit!(PublishRewarded {
            user: ctx.accounts.signer.key(),
            fragment_hash,
            amount,
        });
        Ok(())
    }
}



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
    pub reward_mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRewards<'info> {
    #[account(mut, has_one = authority)]
    pub reward_config: Account<'info, RewardConfig>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributeReward<'info> {
    #[account(mut, seeds = [b"reward_config"], bump = reward_config.bump)]
    pub reward_config: Account<'info, RewardConfig>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub reward_vault: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(mut)]
    pub user_reward_account: Account<'info, anchor_spl::token::TokenAccount>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
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

#[event]
pub struct DocumentRewarded { pub user: Pubkey, pub fragment_hash: [u8; 32], pub amount: u64 }
#[event]
pub struct VerifyRewarded { pub user: Pubkey, pub fragment_hash: [u8; 32], pub amount: u64 }
#[event]
pub struct PublishRewarded { pub user: Pubkey, pub fragment_hash: [u8; 32], pub amount: u64 }
