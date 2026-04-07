//! RDX Treasury — Protocol fee collection and governance.
//!
//! Fees from document processing go to:
//! - 70% Stakers reward pool
//! - 20% Treasury (DAO controlled)
//! - 10% Burned (deflationary)

use anchor_lang::prelude::*;

declare_id!("RDtr11111111111111111111111111111111111111");

#[program]
pub mod rd_treasury {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        treasury.authority = ctx.accounts.authority.key();
        treasury.fee_vault = ctx.accounts.fee_vault.key();
        treasury.total_fees_collected = 0;
        treasury.total_fees_distributed = 0;
        treasury.total_burned = 0;
        treasury.fee_per_document = 100_000_000; // 0.1 RDX
        treasury.stakers_pct = 7000;   // 70% in basis points
        treasury.treasury_pct = 2000;  // 20%
        treasury.burn_pct = 1000;      // 10%
        treasury.bump = ctx.bumps.treasury;
        Ok(())
    }

    pub fn update_fee_distribution(ctx: Context<UpdateTreasury>,
        fee: Option<u64>, stakers: Option<u64>, treasury_p: Option<u64>, burn: Option<u64>
    ) -> Result<()> {
        let t = &mut ctx.accounts.treasury;
        if let Some(v) = fee { t.fee_per_document = v; }
        if let Some(v) = stakers { t.stakers_pct = v; }
        if let Some(v) = treasury_p { t.treasury_pct = v; }
        if let Some(v) = burn { t.burn_pct = v; }
        Ok(())
    }

    pub fn collect_fee(ctx: Context<CollectFee>) -> Result<()> {
        let fee = ctx.accounts.treasury.fee_per_document;
        let t = &mut ctx.accounts.treasury;
        t.total_fees_collected = t.total_fees_collected.checked_add(fee).unwrap();

        let stakers_amount = fee * t.stakers_pct / 10000;
        let treasury_amount = fee * t.treasury_pct / 10000;
        let burn_amount = fee * t.burn_pct / 10000;

        t.total_fees_distributed = t.total_fees_distributed
            .checked_add(stakers_amount)
            .unwrap()
            .checked_add(treasury_amount)
            .unwrap();
        t.total_burned = t.total_burned.checked_add(burn_amount).unwrap();

        emit!(FeeCollected {
            payer: ctx.accounts.payer.key(),
            fee,
            stakers_amount,
            treasury_amount,
            burn_amount,
        });

        Ok(())
    }

    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        require!(
            amount <= ctx.accounts.treasury.total_fees_collected
                .checked_sub(ctx.accounts.treasury.total_fees_distributed)
                .unwrap_or(0),
            TreasuryError::InsufficientFunds
        );
        // Transfer from treasury vault to destination
        emit!(TreasuryWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount,
            destination: ctx.accounts.destination.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Treasury::SPACE,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub fee_vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTreasury<'info> {
    #[account(mut, has_one = authority)]
    pub treasury: Account<'info, Treasury>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CollectFee<'info> {
    #[account(mut, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(mut, has_one = authority)]
    pub treasury: Account<'info, Treasury>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub destination: AccountInfo<'info>,
}

#[account]
pub struct Treasury {
    pub authority: Pubkey,
    pub fee_vault: Pubkey,
    pub total_fees_collected: u64,
    pub total_fees_distributed: u64,
    pub total_burned: u64,
    pub fee_per_document: u64,
    pub stakers_pct: u64,
    pub treasury_pct: u64,
    pub burn_pct: u64,
    pub bump: u8,
}

impl Treasury {
    pub const SPACE: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[event]
pub struct FeeCollected {
    pub payer: Pubkey,
    pub fee: u64,
    pub stakers_amount: u64,
    pub treasury_amount: u64,
    pub burn_amount: u64,
}

#[event]
pub struct TreasuryWithdrawn {
    pub authority: Pubkey,
    pub amount: u64,
    pub destination: Pubkey,
}

#[error_code]
pub enum TreasuryError {
    #[msg("Insufficient treasury funds")]
    InsufficientFunds,
}
