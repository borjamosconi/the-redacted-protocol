use anchor_lang::prelude::*;

declare_id!("RDfrag11111111111111111111111111111111111111");

#[program]
pub mod rd_fragment {
    use super::*;

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
    pub verifier: Signer<'info>,
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

#[error_code]
pub enum FragmentError {
    #[msg("Confidence must be 0-100")]
    InvalidConfidence,
    #[msg("Max 5 topic tags")]
    TooManyTags,
    #[msg("Arweave TX ID too long (max 43)")]
    ArweaveIdTooLong,
}
