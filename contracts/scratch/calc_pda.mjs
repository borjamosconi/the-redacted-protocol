
import { PublicKey } from '@solana/web3.js';

const programId = new PublicKey('2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg');
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from('global')],
  programId
);

console.log('PDA:', pda.toBase58());
console.log('Bump:', bump);
