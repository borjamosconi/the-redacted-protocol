//! # RDX Token Program
//!
//! SPL Token wrapper with vesting schedules and burn mechanism.
//!
//! Features:
//! - Token creation with metadata
//! - Vesting schedules for team tokens
//! - Burn mechanism for deflation
//! - Airdrop distribution

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Burn as TokenBurn, MintTo, Transfer, burn, mint_to, transfer};
use anchor_spl::metadata::{
    Metadata,
    CreateMetadataAccountsV3,
    create_metadata_accounts_v3,
    mpl_token_metadata::types::DataV2,
};

mod token_config;

declare_id!("CaBr5n4mj2iBSc5ADBhEf7rMMGpoeeKeveoSDdUwXsrs");

#[program]
pub mod rd_token {
    use super::*;

    /// Initialize the RDX token with metadata.
    pub fn initialize_token(
        ctx: Context<InitializeToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        require!(name.len() <= 32, TokenError::NameTooLong);
        require!(symbol.len() <= 10, TokenError::SymbolTooLong);
        require!(uri.len() <= 200, TokenError::UriTooLong);

        let token = &mut ctx.accounts.token_metadata;
        token.mint = ctx.accounts.mint.key();
        token.authority = ctx.accounts.authority.key();
        token.name = name;
        token.symbol = symbol;
        token.uri = uri;
        token.decimals = 9;
        token.total_supply = 0;
        token.total_burned = 0;
        token.bump = ctx.bumps.token_metadata;

        emit!(TokenInitialized {
            mint: ctx.accounts.mint.key(),
            name: token.name.clone(),
            symbol: token.symbol.clone(),
        });

        Ok(())
    }

    /// Mint tokens to a recipient (authority only).
    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        let meta = &mut ctx.accounts.token_metadata;
        meta.total_supply = meta.total_supply.checked_add(amount).unwrap();

        emit!(TokensMinted {
            mint: ctx.accounts.mint.key(),
            recipient: ctx.accounts.destination.key(),
            amount,
            total_supply: meta.total_supply,
        });

        Ok(())
    }

    /// Burn tokens (deflationary mechanism).
    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TokenBurn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.source.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;

        let meta = &mut ctx.accounts.token_metadata;
        meta.total_burned = meta.total_burned.checked_add(amount).unwrap();

        emit!(TokensBurned {
            mint: ctx.accounts.mint.key(),
            burner: ctx.accounts.owner.key(),
            amount,
            total_burned: meta.total_burned,
        });

        Ok(())
    }

    /// Initialize a vesting schedule for team tokens.
    pub fn initialize_vesting(
        ctx: Context<InitializeVesting>,
        beneficiary: Pubkey,
        total_amount: u64,
        cliff_duration: i64,
        vesting_duration: i64,
    ) -> Result<()> {
        require!(total_amount > 0, TokenError::ZeroAmount);
        require!(cliff_duration >= 0, TokenError::InvalidDuration);
        require!(vesting_duration > 0, TokenError::InvalidDuration);

        let vesting = &mut ctx.accounts.vesting_schedule;
        vesting.beneficiary = beneficiary;
        vesting.authority = ctx.accounts.authority.key();
        vesting.token_mint = ctx.accounts.mint.key();
        vesting.vault = ctx.accounts.vesting_vault.key();
        vesting.total_amount = total_amount;
        vesting.released_amount = 0;
        vesting.start_time = Clock::get()?.unix_timestamp;
        vesting.cliff_duration = cliff_duration;
        vesting.vesting_duration = vesting_duration;
        vesting.cancelled = false;
        vesting.bump = ctx.bumps.vesting_schedule;

        emit!(VestingInitialized {
            beneficiary,
            total_amount,
            cliff_end: vesting.start_time + cliff_duration,
            vesting_end: vesting.start_time + cliff_duration + vesting_duration,
        });

        Ok(())
    }

    /// Release vested tokens to beneficiary (after cliff).
    pub fn release_vested(ctx: Context<ReleaseVested>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        // Read immutables first so we can release the borrow before CPI.
        let (beneficiary_key, bump, cancelled, cliff_end, total_duration, cliff_duration,
             start_time, total_amount, released_amount) = {
            let v = &ctx.accounts.vesting_schedule;
            (v.beneficiary, v.bump, v.cancelled, v.start_time + v.cliff_duration,
             v.vesting_duration, v.cliff_duration, v.start_time, v.total_amount, v.released_amount)
        };
        require!(!cancelled, TokenError::VestingCancelled);
        require!(now >= cliff_end, TokenError::CliffNotReached);

        let elapsed = now - start_time;
        let vested_amount = if elapsed >= total_duration + cliff_duration {
            total_amount
        } else {
            let elapsed_vesting = elapsed - cliff_duration;
            total_amount * elapsed_vesting as u64 / total_duration as u64
        };

        let releasable = vested_amount.checked_sub(released_amount).unwrap();
        require!(releasable > 0, TokenError::NothingToRelease);

        let seeds: &[&[u8]] = &[b"vesting", beneficiary_key.as_ref(), &[bump]];
        let signer = &[seeds];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vesting_vault.to_account_info(),
                    to: ctx.accounts.beneficiary_token.to_account_info(),
                    authority: ctx.accounts.vesting_schedule.to_account_info(),
                },
                signer,
            ),
            releasable,
        )?;

        let vesting = &mut ctx.accounts.vesting_schedule;
        vesting.released_amount = vesting.released_amount.checked_add(releasable).unwrap();

        emit!(VestingReleased {
            beneficiary: vesting.beneficiary,
            amount: releasable,
            total_released: vesting.released_amount,
        });

        Ok(())
    }

    /// Create Metaplex on-chain metadata for the RDX mint (v3). Must be
    /// called by the current mint authority exactly once.
    pub fn create_metadata(
        ctx: Context<CreateMetadata>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        require!(name.len() <= 32, TokenError::NameTooLong);
        require!(symbol.len() <= 10, TokenError::SymbolTooLong);
        require!(uri.len() <= 200, TokenError::UriTooLong);

        let data = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    mint_authority: ctx.accounts.authority.to_account_info(),
                    update_authority: ctx.accounts.authority.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            data,
            true,
            true,
            None,
        )?;
        Ok(())
    }

    /// Revoke mint authority permanently — call after full distribution is
    /// complete so supply can never grow again.
    pub fn revoke_mint_authority(ctx: Context<SetAuthority>) -> Result<()> {
        anchor_spl::token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::SetAuthority {
                    current_authority: ctx.accounts.authority.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            None,
        )?;
        Ok(())
    }

    /// Cancel a vesting schedule (authority only, before cliff). Sweeps the
    /// remaining vault balance back to `authority_token_account` so the
    /// tokens are not stranded in the PDA-controlled vault forever. The
    /// `cancelled = true` flag is preserved for audit trail / dashboard.
    pub fn cancel_vesting(ctx: Context<CancelVesting>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        // Snapshot immutable state before the mutable borrow for the CPI.
        let (beneficiary_key, bump, cancelled, cliff_end, total_amount, released_amount) = {
            let v = &ctx.accounts.vesting_schedule;
            (v.beneficiary, v.bump, v.cancelled,
             v.start_time + v.cliff_duration,
             v.total_amount, v.released_amount)
        };
        require!(!cancelled, TokenError::VestingCancelled);
        require!(now < cliff_end, TokenError::CliffAlreadyPassed);

        // The "remaining" we intend to claw back is whatever the vault still
        // physically holds. Using vault balance (rather than
        // total_amount - released) is the safer source of truth: it tolerates
        // partial pre-funding and avoids over-transferring if the vault
        // somehow holds less.
        let vault_balance = ctx.accounts.vesting_vault.amount;

        if vault_balance > 0 {
            let seeds: &[&[u8]] = &[b"vesting", beneficiary_key.as_ref(), &[bump]];
            let signer = &[seeds];

            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vesting_vault.to_account_info(),
                        to: ctx.accounts.authority_token_account.to_account_info(),
                        authority: ctx.accounts.vesting_schedule.to_account_info(),
                    },
                    signer,
                ),
                vault_balance,
            )?;
        }

        let vesting = &mut ctx.accounts.vesting_schedule;
        vesting.cancelled = true;

        emit!(VestingCancelled {
            beneficiary: vesting.beneficiary,
            remaining: total_amount.checked_sub(released_amount).unwrap_or(0),
        });
        emit!(VestingFundsRecovered {
            beneficiary: beneficiary_key,
            authority: ctx.accounts.authority.key(),
            amount: vault_balance,
        });

        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct InitializeToken<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TokenMetadata::SPACE,
        seeds = [b"token_metadata", mint.key().as_ref()],
        bump
    )]
    pub token_metadata: Account<'info, TokenMetadata>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut, has_one = authority)]
    pub token_metadata: Account<'info, TokenMetadata>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub token_metadata: Account<'info, TokenMetadata>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(beneficiary: Pubkey)]
pub struct InitializeVesting<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + VestingSchedule::SPACE,
        seeds = [b"vesting", beneficiary.as_ref()],
        bump
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = vesting_vault.mint == mint.key()
    )]
    pub vesting_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ReleaseVested<'info> {
    #[account(
        mut,
        seeds = [b"vesting", vesting_schedule.beneficiary.as_ref()],
        bump = vesting_schedule.bump,
        constraint = vesting_schedule.beneficiary == beneficiary.key()
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,
    #[account(
        mut,
        constraint = vesting_vault.key() == vesting_schedule.vault
    )]
    pub vesting_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = beneficiary_token.mint == mint.key()
    )]
    pub beneficiary_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub beneficiary: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    /// CHECK: Metaplex PDA derived and validated by CPI
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelVesting<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [b"vesting", vesting_schedule.beneficiary.as_ref()],
        bump = vesting_schedule.bump,
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,
    pub authority: Signer<'info>,
    /// Vesting vault holding the locked tokens. On cancel the residual
    /// balance is swept back to `authority_token_account` (CPI signed by
    /// the `vesting_schedule` PDA).
    #[account(
        mut,
        constraint = vesting_vault.key() == vesting_schedule.vault
    )]
    pub vesting_vault: Account<'info, TokenAccount>,
    /// Destination ATA owned by the authority that receives the recovered
    /// (un-released) tokens.
    #[account(
        mut,
        constraint = authority_token_account.mint == vesting_schedule.token_mint,
        constraint = authority_token_account.owner == authority.key()
            @ TokenError::InvalidRecoveryRecipient,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ── Data Structures ──────────────────────────────────────────────

#[account]
pub struct TokenMetadata {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub total_burned: u64,
    pub bump: u8,
}

impl TokenMetadata {
    pub const SPACE: usize = 32 + 32 + 4 + 32 + 4 + 10 + 4 + 200 + 1 + 8 + 8 + 1;
}

#[account]
pub struct VestingSchedule {
    pub beneficiary: Pubkey,
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub vault: Pubkey,
    pub total_amount: u64,
    pub released_amount: u64,
    pub start_time: i64,
    pub cliff_duration: i64,
    pub vesting_duration: i64,
    pub cancelled: bool,
    pub bump: u8,
}

impl VestingSchedule {
    pub const SPACE: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
}

// ── Events ───────────────────────────────────────────────────────

#[event]
pub struct TokenInitialized {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
}

#[event]
pub struct TokensMinted {
    pub mint: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub total_supply: u64,
}

#[event]
pub struct TokensBurned {
    pub mint: Pubkey,
    pub burner: Pubkey,
    pub amount: u64,
    pub total_burned: u64,
}

#[event]
pub struct VestingInitialized {
    pub beneficiary: Pubkey,
    pub total_amount: u64,
    pub cliff_end: i64,
    pub vesting_end: i64,
}

#[event]
pub struct VestingReleased {
    pub beneficiary: Pubkey,
    pub amount: u64,
    pub total_released: u64,
}

#[event]
pub struct VestingCancelled {
    pub beneficiary: Pubkey,
    pub remaining: u64,
}

#[event]
pub struct VestingFundsRecovered {
    pub beneficiary: Pubkey,
    pub authority: Pubkey,
    pub amount: u64,
}

// ── Errors ───────────────────────────────────────────────────────

#[error_code]
pub enum TokenError {
    #[msg("Token name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Token symbol too long (max 10 chars)")]
    SymbolTooLong,
    #[msg("Token URI too long (max 200 chars)")]
    UriTooLong,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Invalid duration (must be non-negative)")]
    InvalidDuration,
    #[msg("Vesting cliff not yet reached")]
    CliffNotReached,
    #[msg("Vesting cliff already passed, cannot cancel")]
    CliffAlreadyPassed,
    #[msg("Vesting has been cancelled")]
    VestingCancelled,
    #[msg("Nothing to release")]
    NothingToRelease,
    #[msg("Recovery recipient must be owned by the vesting authority")]
    InvalidRecoveryRecipient,
}
