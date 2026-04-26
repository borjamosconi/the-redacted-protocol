//! RDX Treasury — protocol-level SOL fee sink with PDA-controlled vault.
//!
//! This is the 1% treasury cut for all pump.fun-style trades on the RDX
//! launchpad, plus the 5% share of presale proceeds and any document fee.
//! The vault is a PDA SystemAccount so the program holds SOL and only the
//! authority can withdraw. Burn share is accounted in state but executed
//! off-chain (we buy RDX on the open market then call rd-token::burn).

use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("HpvmQtmxyPeeYKGvKHqEdcnsYUzAQrdynoCX452s2xLz");

/// Hard cap on the number of allow-listed withdraw recipients. Bounded to
/// keep the account size deterministic and the linear contains() scan cheap.
pub const MAX_ALLOWED_RECIPIENTS: usize = 10;

#[program]
pub mod rd_treasury {
    use super::*;

    /// Create the treasury + its SOL vault PDA. The recipient whitelist
    /// starts empty; authority must explicitly add destinations via
    /// `add_allowed_recipient` before any `withdraw_sol` can succeed.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let t = &mut ctx.accounts.treasury;
        t.authority = ctx.accounts.authority.key();
        t.fee_vault = ctx.accounts.fee_vault.key();
        t.total_fees_collected = 0;
        t.total_fees_distributed = 0;
        t.total_burned = 0;
        t.fee_per_document = 100_000_000; // 0.1 RDX (9 decimals)
        t.stakers_pct = 7000;
        t.treasury_pct = 2000;
        t.burn_pct = 1000;
        t.bump = ctx.bumps.treasury;
        t.vault_bump = ctx.bumps.fee_vault;
        t.allowed_recipients = Vec::new();
        Ok(())
    }

    /// Add `recipient` to the withdraw whitelist (authority only). Bounded by
    /// `MAX_ALLOWED_RECIPIENTS`; duplicate adds are no-ops.
    pub fn add_allowed_recipient(
        ctx: Context<UpdateTreasury>,
        recipient: Pubkey,
    ) -> Result<()> {
        let t = &mut ctx.accounts.treasury;
        require!(
            t.allowed_recipients.len() < MAX_ALLOWED_RECIPIENTS,
            TreasuryError::RecipientListFull
        );
        if !t.allowed_recipients.contains(&recipient) {
            t.allowed_recipients.push(recipient);
            emit!(RecipientAdded { recipient });
        }
        Ok(())
    }

    /// Remove `recipient` from the withdraw whitelist (authority only).
    pub fn remove_allowed_recipient(
        ctx: Context<UpdateTreasury>,
        recipient: Pubkey,
    ) -> Result<()> {
        let t = &mut ctx.accounts.treasury;
        let before = t.allowed_recipients.len();
        t.allowed_recipients.retain(|k| k != &recipient);
        if t.allowed_recipients.len() != before {
            emit!(RecipientRemoved { recipient });
        }
        Ok(())
    }

    /// Update distribution (admin only).
    pub fn update_fee_distribution(
        ctx: Context<UpdateTreasury>,
        fee: Option<u64>,
        stakers: Option<u64>,
        treasury_p: Option<u64>,
        burn: Option<u64>,
    ) -> Result<()> {
        let t = &mut ctx.accounts.treasury;
        if let Some(v) = fee { t.fee_per_document = v; }
        if let Some(v) = stakers { t.stakers_pct = v; }
        if let Some(v) = treasury_p { t.treasury_pct = v; }
        if let Some(v) = burn { t.burn_pct = v; }
        let sum = t.stakers_pct + t.treasury_pct + t.burn_pct;
        require!(sum == 10_000, TreasuryError::InvalidDistribution);
        Ok(())
    }

    /// Anyone can deposit SOL into the treasury vault (used by bonding-curve
    /// and presale CPIs; also accepts manual donations).
    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        require!(amount > 0, TreasuryError::ZeroAmount);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.fee_vault.to_account_info(),
                },
            ),
            amount,
        )?;
        let t = &mut ctx.accounts.treasury;
        t.total_fees_collected = t.total_fees_collected.checked_add(amount).unwrap();

        emit!(SolDeposited {
            payer: ctx.accounts.payer.key(),
            amount,
            new_total: t.total_fees_collected,
        });
        Ok(())
    }

    /// Authority-only withdrawal from the vault PDA. Moves `amount` lamports
    /// to `destination`. Use this to fund stakers-pool, burn-buyback, etc.
    ///
    /// Defense-in-depth: even though `authority` already gates this
    /// instruction, the destination MUST be on `allowed_recipients`. If an
    /// authority key is ever compromised, the attacker can only move funds
    /// to wallets that were pre-blessed by a previous (clean) authority sig.
    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        require!(amount > 0, TreasuryError::ZeroAmount);
        let vault_lamports = ctx.accounts.fee_vault.to_account_info().lamports();
        require!(amount <= vault_lamports, TreasuryError::InsufficientFunds);

        require!(
            ctx.accounts
                .treasury
                .allowed_recipients
                .contains(&ctx.accounts.destination.key()),
            TreasuryError::RecipientNotWhitelisted
        );

        let vault_bump = ctx.accounts.treasury.vault_bump;
        let seeds: &[&[u8]] = &[b"fee_vault", &[vault_bump]];
        let signer = &[seeds];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.fee_vault.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        let t = &mut ctx.accounts.treasury;
        t.total_fees_distributed = t.total_fees_distributed.checked_add(amount).unwrap();

        emit!(SolWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount,
            destination: ctx.accounts.destination.key(),
        });
        Ok(())
    }

    /// Record that `amount` lamports have been used for a RDX buyback+burn
    /// completed off-chain. Purely accounting (for dashboard totals).
    pub fn record_burn(ctx: Context<UpdateTreasury>, amount: u64) -> Result<()> {
        let t = &mut ctx.accounts.treasury;
        t.total_burned = t.total_burned.checked_add(amount).unwrap();
        emit!(BurnRecorded { amount, new_total: t.total_burned });
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
    /// CHECK: SOL-holding PDA
    #[account(
        mut,
        seeds = [b"fee_vault"],
        bump
    )]
    pub fee_vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTreasury<'info> {
    #[account(mut, has_one = authority, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    /// CHECK: vault PDA
    #[account(mut, seeds = [b"fee_vault"], bump = treasury.vault_bump)]
    pub fee_vault: SystemAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(mut, has_one = authority, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    pub authority: Signer<'info>,
    /// CHECK: vault PDA
    #[account(mut, seeds = [b"fee_vault"], bump = treasury.vault_bump)]
    pub fee_vault: SystemAccount<'info>,
    /// CHECK: any destination set by authority
    #[account(mut)]
    pub destination: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
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
    pub vault_bump: u8,
    /// Withdraw destination whitelist. Mutated only by
    /// `add_allowed_recipient` / `remove_allowed_recipient`, bounded to
    /// `MAX_ALLOWED_RECIPIENTS` entries.
    pub allowed_recipients: Vec<Pubkey>,
}

impl Treasury {
    // Original fixed fields (32+32+8*7+1+1) = 122 bytes, plus 16 historical
    // padding bytes. Append the bounded Vec<Pubkey>: 4-byte length prefix +
    // 32 * MAX_ALLOWED_RECIPIENTS for the elements.
    pub const SPACE: usize =
        32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 16
        + 4 + 32 * MAX_ALLOWED_RECIPIENTS;
}

#[event]
pub struct SolDeposited {
    pub payer: Pubkey,
    pub amount: u64,
    pub new_total: u64,
}

#[event]
pub struct SolWithdrawn {
    pub authority: Pubkey,
    pub amount: u64,
    pub destination: Pubkey,
}

#[event]
pub struct BurnRecorded {
    pub amount: u64,
    pub new_total: u64,
}

#[event]
pub struct RecipientAdded {
    pub recipient: Pubkey,
}

#[event]
pub struct RecipientRemoved {
    pub recipient: Pubkey,
}

#[error_code]
pub enum TreasuryError {
    #[msg("Insufficient treasury funds")]
    InsufficientFunds,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Distribution must sum to 10000 bps")]
    InvalidDistribution,
    #[msg("Withdraw destination is not on the allow-list")]
    RecipientNotWhitelisted,
    #[msg("Recipient allow-list is full (max 10)")]
    RecipientListFull,
}
