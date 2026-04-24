use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

declare_id!("8JJd3isBeCkYtsdwTFFLNRCJJXQbABMRgX67vnVzDvSN");

#[program]
pub mod rd_governance {
    use super::*;

    /// Initialize the DAO governance config
    pub fn initialize_dao(
        ctx: Context<InitializeDao>,
        min_tokens_to_propose: u64,
        voting_period_secs: i64,
    ) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        dao.authority = ctx.accounts.authority.key();
        dao.rdx_mint = ctx.accounts.rdx_mint.key();
        dao.min_tokens_to_propose = min_tokens_to_propose;
        dao.voting_period_secs = voting_period_secs;
        dao.proposal_count = 0;
        dao.total_voters = 0;
        
        Ok(())
    }

    /// Create a new proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
    ) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        let proposal = &mut ctx.accounts.proposal;
        
        // Ensure user has enough tokens to propose
        require!(
            ctx.accounts.proposer_token_account.amount >= dao.min_tokens_to_propose,
            GovernanceError::InsufficientTokensToPropose
        );

        proposal.id = dao.proposal_count;
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.title = title;
        proposal.description = description;
        proposal.start_time = Clock::get()?.unix_timestamp;
        proposal.end_time = proposal.start_time + dao.voting_period_secs;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.is_executed = false;
        
        dao.proposal_count += 1;

        Ok(())
    }

    /// Vote on a proposal
    pub fn vote(ctx: Context<VoteAction>, side: bool) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let vote_record = &mut ctx.accounts.vote_record;
        
        let now = Clock::get()?.unix_timestamp;
        require!(now <= proposal.end_time, GovernanceError::VotingEnded);
        require!(now >= proposal.start_time, GovernanceError::VotingNotStarted);
        
        // Voting power = current token balance
        let voting_power = ctx.accounts.voter_token_account.amount;
        require!(voting_power > 0, GovernanceError::NoVotingPower);

        if side {
            proposal.votes_for = proposal.votes_for.saturating_add(voting_power);
        } else {
            proposal.votes_against = proposal.votes_against.saturating_add(voting_power);
        }

        vote_record.voter = ctx.accounts.voter.key();
        vote_record.proposal_id = proposal.id;
        vote_record.power = voting_power;
        vote_record.side = side;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeDao<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + 128,
        seeds = [b"dao_config"],
        bump
    )]
    pub dao: Account<'info, DaoConfig>,
    pub rdx_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,
    #[account(mut, seeds = [b"dao_config"], bump)]
    pub dao: Account<'info, DaoConfig>,
    #[account(
        init,
        payer = proposer,
        space = 8 + 512,
        seeds = [b"proposal", dao.proposal_count.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub proposer_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteAction<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init,
        payer = voter,
        space = 8 + 64,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    pub voter_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct DaoConfig {
    pub authority: Pubkey,
    pub rdx_mint: Pubkey,
    pub min_tokens_to_propose: u64,
    pub voting_period_secs: i64,
    pub proposal_count: u64,
    pub total_voters: u64,
}

#[account]
pub struct Proposal {
    pub id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub description: String,
    pub start_time: i64,
    pub end_time: i64,
    pub votes_for: u64,
    pub votes_against: u64,
    pub is_executed: bool,
}

#[account]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub proposal_id: u64,
    pub power: u64,
    pub side: bool,
}

#[error_code]
pub enum GovernanceError {
    #[msg("Insufficient tokens to create a proposal")]
    InsufficientTokensToPropose,
    #[msg("Voting period has ended")]
    VotingEnded,
    #[msg("Voting has not started yet")]
    VotingNotStarted,
    #[msg("No voting power (RDX balance is 0)")]
    NoVotingPower,
}
