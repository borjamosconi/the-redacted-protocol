import { PublicKey } from "@solana/web3.js";

const bytes = Buffer.from("f8b41478a81f2d43129702ff6f103393f2b92bd3509852e356e383c211821dd2", "hex");
console.log("Treasury:", new PublicKey(bytes).toBase58());
