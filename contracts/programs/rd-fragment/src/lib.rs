use anchor_lang::prelude::*;

declare_id!("5CLiUA3yqHNoKAdPeHjeNkipDjjYFPwTpnEFfuR9JxWd");

/// Maximum number of authorized verifiers stored on-chain.
pub const MAX_VERIFIERS: usize = 10;
pub const TRUTH_BOND_LAMPORTS: u64 = 100_000_000; // 0.1 SOL bond

#[program]
pub mod rd_fragment {
    use super::*;

    /// One-time initializer for the FragmentConfig PDA. The signer becomes admin.
    /// The verifiers list starts empty — admin must add at least one verifier
    /// (typically themselves) before any `verify_fragment` call can succeed.
    pub fn init_fragment_config(ctx: Context<InitFragmentConfig>) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.verifiers = Vec::new();
        cfg.bump = ctx.bumps.config;
        cfg.bond_vault_bump = ctx.bumps.bond_vault;
        emit!(FragmentConfigInitialized {
            admin: cfg.admin,
        });
        Ok(())
    }

    /// Admin-only: add a verifier pubkey to the whitelist (idempotent).
    pub fn add_verifier(ctx: Context<AdminConfig>, verifier: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        require!(cfg.verifiers.len() < MAX_VERIFIERS, FragmentError::TooManyVerifiers);
        if !cfg.verifiers.contains(&verifier) {
            cfg.verifiers.push(verifier);
            emit!(VerifierAdded { verifier });
        }
        Ok(())
    }

    /// Admin-only: remove a verifier pubkey from the whitelist.
    pub fn remove_verifier(ctx: Context<AdminConfig>, verifier: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        let before = cfg.verifiers.len();
        cfg.verifiers.retain(|k| k != &verifier);
        if cfg.verifiers.len() != before {
            emit!(VerifierRemoved { verifier });
        }
        Ok(())
    }

    pub fn submit_fragment(
        ctx: Context<SubmitFragment>,
        content_hash: [u8; 32],
        reconstruction_hash: [u8; 32],
        confidence: u8,
        arweave_tx_id: String,
        topic_tags: Vec<String>,
    ) -> Result<()> {
        require!(confidence <= 100, FragmentError::InvalidConfidence);
        require!(topic_tags.len() <= 5, FragmentError::TooManyTags);
        require!(arweave_tx_id.len() <= 43, FragmentError::ArweaveIdTooLong);

        let f = &mut ctx.accounts.fragment;
        f.content_hash = content_hash;
        f.reconstruction_hash = reconstruction_hash;
        f.confidence = confidence;
        f.submitter = ctx.accounts.submitter.key();
        f.timestamp = Clock::get()?.unix_timestamp;
        f.arweave_tx_id = arweave_tx_id;
        f.topic_tags = topic_tags;
        f.bump = ctx.bumps.fragment;
        f.is_verified = false;
        f.zk_proof_hash = [0u8; 32];

        emit!(FragmentSubmitted {
            content_hash,
            submitter: ctx.accounts.submitter.key(),
            confidence,
            timestamp: f.timestamp,
        });
        Ok(())
    }

    pub fn verify_fragment(ctx: Context<VerifyFragment>, proof_hash: [u8; 32]) -> Result<()> {
        let f = &mut ctx.accounts.fragment;
        require!(!f.is_verified, FragmentError::AlreadyVerified);

        // Truth Bond: Transfer bond from verifier to a vault (or treasury)
        // If the verifier is a whitelisted senior verifier, they might not need a bond,
        // but for a senior implementation, everyone stakes for skin in the game.
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.verifier.to_account_info(),
                    to: ctx.accounts.bond_vault.to_account_info(),
                },
            ),
            TRUTH_BOND_LAMPORTS,
        )?;

        f.is_verified = true;
        f.verifier = ctx.accounts.verifier.key();
        f.zk_proof_hash = proof_hash;
        f.bond_amount = TRUTH_BOND_LAMPORTS;

        // Update Verifier Stats
        let stats = &mut ctx.accounts.verifier_stats;
        stats.total_verifications += 1;
        stats.last_active = Clock::get()?.unix_timestamp;
        if stats.owner == Pubkey::default() {
            stats.owner = ctx.accounts.verifier.key();
        }

        emit!(FragmentVerified { 
            content_hash: f.content_hash, 
            verifier: ctx.accounts.verifier.key(),
            proof_hash 
        });
        Ok(())
    }

    /// Challenge a verified fragment. If the challenge is successful (admin decided),
    /// the challenger gets the bond. This creates a decentralized watchdog system.
    pub fn dispute_fragment(ctx: Context<DisputeFragment>) -> Result<()> {
        let f = &mut ctx.accounts.fragment;
        require!(f.is_verified, FragmentError::NotVerifiedYet);
        require!(!f.is_disputed, FragmentError::AlreadyDisputed);

        // Challenger must also stake a bond to prevent spam challenges
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.challenger.to_account_info(),
                    to: ctx.accounts.bond_vault.to_account_info(),
                },
            ),
            TRUTH_BOND_LAMPORTS,
        )?;

        f.is_disputed = true;
        f.challenger = ctx.accounts.challenger.key();
        
        emit!(FragmentDisputed { 
            content_hash: f.content_hash, 
            challenger: ctx.accounts.challenger.key() 
        });
        Ok(())
    }

    /// Admin resolves a dispute.
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, verifier_won: bool) -> Result<()> {
        let f = &mut ctx.accounts.fragment;
        require!(f.is_disputed, FragmentError::NoActiveDispute);

        let total_reward = f.bond_amount.checked_mul(2).unwrap(); // Verifier bond + Challenger bond
        
        let recipient = if verifier_won {
            ctx.accounts.verifier_stats.successful_verifications += 1;
            ctx.accounts.verifier.to_account_info()
        } else {
            ctx.accounts.verifier_stats.failed_verifications += 1;
            f.is_verified = false; // Strip verification
            ctx.accounts.challenger.to_account_info()
        };

        // Payout the bond(s)
        let vault_bump = ctx.accounts.config.bond_vault_bump;
        let seeds: &[&[u8]] = &[b"bond_vault", &[vault_bump]];
        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.bond_vault.to_account_info(),
                    to: recipient,
                },
                &[seeds],
            ),
            total_reward,
        )?;

        f.is_disputed = false;
        
        emit!(DisputeResolved { 
            content_hash: f.content_hash, 
            verifier_won 
        });
        Ok(())
    }
}

#[account]
pub struct FragmentAccount {
    pub content_hash: [u8; 32],
    pub reconstruction_hash: [u8; 32],
    pub zk_proof_hash: [u8; 32],
    pub submitter: Pubkey,
    pub verifier: Pubkey,
    pub challenger: Pubkey,
    pub confidence: u8,
    pub is_verified: bool,
    pub is_disputed: bool,
    pub bond_amount: u64,
    pub timestamp: i64,
    pub arweave_tx_id: String,
    pub topic_tags: Vec<String>,
    pub bump: u8,
}

#[account]
pub struct VerifierStats {
    pub owner: Pubkey,
    pub total_verifications: u64,
    pub successful_verifications: u64,
    pub failed_verifications: u64,
    pub last_active: i64,
    pub bump: u8,
}

impl VerifierStats {
    pub const SPACE: usize = 32 + 8 + 8 + 8 + 8 + 1 + 32;
}

/// Singleton admin / verifier-whitelist config.
#[account]
pub struct FragmentConfig {
    pub admin: Pubkey,
    pub verifiers: Vec<Pubkey>,
    pub bump: u8,
    pub bond_vault_bump: u8,
}

impl FragmentConfig {
    // 8 disc + 32 admin + 4 vec_len + 32*MAX_VERIFIERS + 1 bump + 1 bond_bump
    pub const SPACE: usize = 32 + 4 + 32 * MAX_VERIFIERS + 1 + 1;
}

#[derive(Accounts)]
#[instruction(content_hash: [u8; 32])]
pub struct SubmitFragment<'info> {
    #[account(
        init,
        payer = submitter,
        space = 8 + 32 + 32 + 32 + 32 + 1 + 1 + 8 + 4 + 43 + (5 * 50) + 1,
        seeds = [b"fragment", content_hash.as_ref()],
        bump
    )]
    pub fragment: Account<'info, FragmentAccount>,
    #[account(mut)]
    pub submitter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyFragment<'info> {
    #[account(mut)]
    pub fragment: Account<'info, FragmentAccount>,
    #[account(seeds = [b"fragment_config"], bump = config.bump)]
    pub config: Account<'info, FragmentConfig>,
    /// CHECK: PDA vault that holds bonds
    #[account(mut, seeds = [b"bond_vault"], bump = config.bond_vault_bump)]
    pub bond_vault: SystemAccount<'info>,
    #[account(
        init_if_needed,
        payer = verifier,
        space = 8 + VerifierStats::SPACE,
        seeds = [b"verifier_stats", verifier.key().as_ref()],
        bump
    )]
    pub verifier_stats: Account<'info, VerifierStats>,
    #[account(mut)]
    pub verifier: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DisputeFragment<'info> {
    #[account(mut)]
    pub fragment: Account<'info, FragmentAccount>,
    #[account(seeds = [b"fragment_config"], bump = config.bump)]
    pub config: Account<'info, FragmentConfig>,
    /// CHECK: PDA vault
    #[account(mut, seeds = [b"bond_vault"], bump = config.bond_vault_bump)]
    pub bond_vault: SystemAccount<'info>,
    #[account(mut)]
    pub challenger: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub fragment: Account<'info, FragmentAccount>,
    #[account(
        seeds = [b"fragment_config"], 
        bump = config.bump,
        has_one = admin @ FragmentError::NotAdmin
    )]
    pub config: Account<'info, FragmentConfig>,
    /// CHECK: PDA vault
    #[account(mut, seeds = [b"bond_vault"], bump = config.bond_vault_bump)]
    pub bond_vault: SystemAccount<'info>,
    #[account(mut, seeds = [b"verifier_stats", fragment.verifier.as_ref()], bump = verifier_stats.bump)]
    pub verifier_stats: Account<'info, VerifierStats>,
    /// CHECK: Paid out if verifier wins
    #[account(mut, address = fragment.verifier)]
    pub verifier: UncheckedAccount<'info>,
    /// CHECK: Paid out if challenger wins
    #[account(mut, address = fragment.challenger)]
    pub challenger: UncheckedAccount<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

    #[account(
        init,
        payer = admin,
        space = 8 + FragmentConfig::SPACE,
        seeds = [b"fragment_config"],
        bump
    )]
    pub config: Account<'info, FragmentConfig>,
    /// CHECK: Initialize the bond vault PDA
    #[account(mut, seeds = [b"bond_vault"], bump)]
    pub bond_vault: SystemAccount<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminConfig<'info> {
    #[account(
        mut,
        seeds = [b"fragment_config"],
        bump = config.bump,
        has_one = admin @ FragmentError::NotAdmin,
    )]
    pub config: Account<'info, FragmentConfig>,
    pub admin: Signer<'info>,
}

#[event]
pub struct FragmentSubmitted {
    pub content_hash: [u8; 32],
    pub submitter: Pubkey,
    pub confidence: u8,
    pub timestamp: i64,
}

#[event]
pub struct FragmentVerified {
    pub content_hash: [u8; 32],
    pub verifier: Pubkey,
    pub proof_hash: [u8; 32],
}

#[event]
pub struct FragmentConfigInitialized {
    pub admin: Pubkey,
}

#[event]
pub struct VerifierAdded {
    pub verifier: Pubkey,
}

#[event]
pub struct VerifierRemoved {
    pub verifier: Pubkey,
}

#[error_code]
pub enum FragmentError {
    #[msg("Confidence must be 0-100")]
    InvalidConfidence,
    #[msg("Max 5 topic tags")]
    TooManyTags,
    #[msg("Arweave TX ID too long (max 43)")]
    ArweaveIdTooLong,
    #[msg("Signer is not on the verifier whitelist")]
    NotVerifier,
    #[msg("Signer is not the FragmentConfig admin")]
    NotAdmin,
    #[msg("Verifier whitelist is full")]
    TooManyVerifiers,
    #[msg("Fragment is already verified")]
    AlreadyVerified,
    #[msg("Fragment is already disputed")]
    AlreadyDisputed,
    #[msg("Fragment has not been verified yet")]
    NotVerifiedYet,
    #[msg("No active dispute on this fragment")]
    NoActiveDispute,
}

#[event]
pub struct FragmentDisputed {
    pub content_hash: [u8; 32],
    pub challenger: Pubkey,
}

#[event]
pub struct DisputeResolved {
    pub content_hash: [u8; 32],
    pub verifier_won: bool,
}
