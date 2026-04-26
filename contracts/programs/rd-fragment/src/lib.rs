use anchor_lang::prelude::*;

declare_id!("5CLiUA3yqHNoKAdPeHjeNkipDjjYFPwTpnEFfuR9JxWd");

/// Maximum number of authorized verifiers stored on-chain.
pub const MAX_VERIFIERS: usize = 10;

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
        // Whitelist enforcement: only pubkeys explicitly authorized by the
        // admin in `FragmentConfig.verifiers` may mark a fragment verified.
        let cfg = &ctx.accounts.config;
        require!(
            cfg.verifiers.contains(&ctx.accounts.verifier.key()),
            FragmentError::NotVerifier
        );

        let f = &mut ctx.accounts.fragment;
        f.is_verified = true;
        f.zk_proof_hash = proof_hash;
        emit!(FragmentVerified { content_hash: f.content_hash, proof_hash });
        Ok(())
    }
}

#[account]
pub struct FragmentAccount {
    pub content_hash: [u8; 32],
    pub reconstruction_hash: [u8; 32],
    pub zk_proof_hash: [u8; 32],
    pub submitter: Pubkey,
    pub confidence: u8,
    pub is_verified: bool,
    pub timestamp: i64,
    pub arweave_tx_id: String,
    pub topic_tags: Vec<String>,
    pub bump: u8,
}

/// Singleton admin / verifier-whitelist config.
#[account]
pub struct FragmentConfig {
    pub admin: Pubkey,
    pub verifiers: Vec<Pubkey>,
    pub bump: u8,
}

impl FragmentConfig {
    // 8 disc + 32 admin + 4 vec_len + 32*MAX_VERIFIERS + 1 bump
    pub const SPACE: usize = 32 + 4 + 32 * MAX_VERIFIERS + 1;
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
    pub verifier: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitFragmentConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + FragmentConfig::SPACE,
        seeds = [b"fragment_config"],
        bump
    )]
    pub config: Account<'info, FragmentConfig>,
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
}
