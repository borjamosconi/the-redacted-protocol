import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync, MINT_SIZE,
  createInitializeMintInstruction, getMinimumBalanceForRentExemptMint
} from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

const RPC = 'https://api.devnet.solana.com'
const KEYPAIR_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '~', '.config/solana/id.json')
const PROGRAM_ID = new PublicKey('AfkwwBhRsuEzZo74mdbwK8EBwo7VYwc8S1T7hb1RHMAa')

const TOKENS = [
    { name: 'Epstein Flight Logs', symbol: 'EPST', desc: 'Declassified flight logs from the Lolita Express.' },
    { name: 'Pentagon UAP Report', symbol: 'UAP', desc: 'Classified briefings on unidentified aerial phenomena.' },
    { name: 'Area 51 Personnel', symbol: 'AREA51', desc: 'Employee records and clearance levels from Groom Lake.' },
    { name: 'Project MKUltra', symbol: 'MKUL', desc: 'CIA mind control experiment archives.' },
    { name: 'Snowden Archive', symbol: 'SNOW', desc: 'Full uncut leaks regarding global surveillance.' }
]

async function seed() {
    const connection = new Connection(RPC, 'confirmed')
    const secret = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))
    const wallet = Keypair.fromSecretKey(Uint8Array.from(secret))
    const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' })
    anchor.setProvider(provider)

    const idlPath = path.join(__dirname, '..', 'target', 'idl', 'rd_bondingcurve.json')
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'))
    const program = new Program(idl, provider)

    console.log(`Seeding tokens from wallet: ${wallet.publicKey.toBase58()}`)

    for (const t of TOKENS) {
        console.log(`\nCreating token: ${t.name} ($${t.symbol})...`)
        const mintKp = Keypair.generate()
        const mint = mintKp.publicKey
        const [global] = PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)
        const [pool] = PublicKey.findProgramAddressSync([Buffer.from('pool'), mint.toBuffer()], PROGRAM_ID)
        const [solVault] = PublicKey.findProgramAddressSync([Buffer.from('sol_vault'), mint.toBuffer()], PROGRAM_ID)
        const poolTokenVault = getAssociatedTokenAddressSync(mint, pool, true)

        const rent = await getMinimumBalanceForRentExemptMint(connection)
        
        const tx = await program.methods
            .createPool(t.name, t.symbol, `https://api.redacted.bond/api/tokens/${mint.toBase58()}/metadata.json`)
            .accounts({
                global, pool, mint,
                poolTokenVault, solVault,
                creator: wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .preInstructions([
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mint,
                    space: MINT_SIZE,
                    lamports: rent,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMintInstruction(mint, 6, wallet.publicKey, wallet.publicKey)
            ])
            .signers([wallet, mintKp])
            .rpc()

        console.log(`✓ Created! Mint: ${mint.toBase58()}`)
        console.log(`  Tx: ${tx}`)
    }
}

seed().catch(console.error)
