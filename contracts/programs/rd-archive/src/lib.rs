use anchor_lang::prelude::*;

declare_id!("14B5ikWDUQdp4syWvYY15UpGmVXtQnKZEqxiJz7aAHhM");

#[program]
pub mod rd_archive {
    use super::*;

    pub fn register_entry(
        ctx: Context<RegisterEntry>,
        fragment_hash: [u8; 32],
        sequence_number: u64,
        arweave_tx: String,
    ) -> Result<()> {
        let e = &mut ctx.accounts.entry;
        e.fragment_hash = fragment_hash;
        e.sequence_number = sequence_number;
        e.arweave_tx = arweave_tx;
        e.registrar = ctx.accounts.registrar.key();
        e.timestamp = Clock::get()?.unix_timestamp;

        emit!(EntryRegistered { fragment_hash, sequence_number, timestamp: e.timestamp });
        Ok(())
    }
}

#[account]
pub struct ArchiveEntry {
    pub fragment_hash: [u8; 32],
    pub sequence_number: u64,
    pub arweave_tx: String,
    pub registrar: Pubkey,
    pub timestamp: i64,
}

#[derive(Accounts)]
#[instruction(fragment_hash: [u8; 32], sequence_number: u64)]
pub struct RegisterEntry<'info> {
    #[account(
        init,
        payer = registrar,
        space = 8 + 32 + 8 + 4 + 43 + 32 + 8,
        seeds = [b"archive", sequence_number.to_le_bytes().as_ref()],
        bump
    )]
    pub entry: Account<'info, ArchiveEntry>,
    #[account(mut)]
    pub registrar: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct EntryRegistered {
    pub fragment_hash: [u8; 32],
    pub sequence_number: u64,
    pub timestamp: i64,
}
