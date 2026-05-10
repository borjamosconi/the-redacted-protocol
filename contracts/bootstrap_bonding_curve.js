const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function bootstrap() {
    const RPC = 'https://api.devnet.solana.com';
    const KEYPAIR_PATH = '../wallet.json';
    const TREASURY = new PublicKey('CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8');
    const MIGRATION_AUTH = new PublicKey('HjqNchH7bsvgi1gSo9m3wbUasmQT1TaaRbJduDQ5uyPw');
    
    const idlPath = './target/idl/rd_bondingcurve.json';
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8')));
    const admin = Keypair.fromSecretKey(secretKey);

    const connection = new Connection(RPC, 'confirmed');
    const wallet = new anchor.Wallet(admin);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    anchor.setProvider(provider);

    const program = new anchor.Program(idl, provider);
    const PROGRAM_ID = new PublicKey(idl.address || idl.metadata.address);

    const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID);

    console.log('Initializing rd-bondingcurve global state...');
    console.log('Program ID:', PROGRAM_ID.toBase58());
    console.log('Global PDA:', globalPda.toBase58());
    
    try {
        const sig = await program.methods
            .initializeGlobal()
            .accounts({
                global: globalPda,
                admin: admin.publicKey,
                treasury: TREASURY,
                migrationAuthority: MIGRATION_AUTH,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        console.log('Success! TX:', sig);
    } catch (err) {
        console.error('Initialization failed:', err);
        process.exit(1);
    }
}

bootstrap();
