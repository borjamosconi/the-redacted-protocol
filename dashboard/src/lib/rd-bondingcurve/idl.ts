// Minimal IDL stub for rd-bondingcurve.
//
// Replace the body below with the JSON at contracts/target/idl/rd_bondingcurve.json
// after running `anchor build`. The structure mirrors the on-chain program at
// contracts/programs/rd-bondingcurve/src/lib.rs.

export type BondingCurveIDL = any

export const IDL: BondingCurveIDL = {
  version: '0.1.0',
  name: 'rd_bondingcurve',
  instructions: [
    {
      name: 'initializeGlobal',
      accounts: [
        { name: 'global', isMut: true, isSigner: false },
        { name: 'admin', isMut: true, isSigner: true },
        { name: 'treasury', isMut: false, isSigner: false },
        { name: 'migrationAuthority', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'createPool',
      accounts: [
        { name: 'global', isMut: false, isSigner: false },
        { name: 'pool', isMut: true, isSigner: false },
        { name: 'mint', isMut: true, isSigner: false },
        { name: 'poolTokenVault', isMut: true, isSigner: false },
        { name: 'solVault', isMut: true, isSigner: false },
        { name: 'creator', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'associatedTokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'rent', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'name', type: 'string' },
        { name: 'symbol', type: 'string' },
        { name: 'uri', type: 'string' },
      ],
    },
    {
      name: 'buy',
      accounts: [
        { name: 'global', isMut: false, isSigner: false },
        { name: 'pool', isMut: true, isSigner: false },
        { name: 'mint', isMut: false, isSigner: false },
        { name: 'poolTokenVault', isMut: true, isSigner: false },
        { name: 'solVault', isMut: true, isSigner: false },
        { name: 'buyerTokenAccount', isMut: true, isSigner: false },
        { name: 'buyer', isMut: true, isSigner: true },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'creatorWallet', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'associatedTokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'solIn', type: 'u64' },
        { name: 'minTokensOut', type: 'u64' },
      ],
    },
    {
      name: 'sell',
      accounts: [
        { name: 'global', isMut: false, isSigner: false },
        { name: 'pool', isMut: true, isSigner: false },
        { name: 'mint', isMut: false, isSigner: false },
        { name: 'poolTokenVault', isMut: true, isSigner: false },
        { name: 'solVault', isMut: true, isSigner: false },
        { name: 'sellerTokenAccount', isMut: true, isSigner: false },
        { name: 'seller', isMut: true, isSigner: true },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'creatorWallet', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'tokensIn', type: 'u64' },
        { name: 'minSolOut', type: 'u64' },
      ],
    },
  ],
  accounts: [
    {
      name: 'PoolState',
      type: {
        kind: 'struct',
        fields: [
          { name: 'mint', type: 'publicKey' },
          { name: 'creator', type: 'publicKey' },
          { name: 'virtualSolReserves', type: 'u64' },
          { name: 'virtualTokenReserves', type: 'u64' },
          { name: 'realSolReserves', type: 'u64' },
          { name: 'realTokenReserves', type: 'u64' },
          { name: 'tokenTotalSupply', type: 'u64' },
          { name: 'graduated', type: 'bool' },
          { name: 'migrated', type: 'bool' },
          { name: 'bump', type: 'u8' },
          { name: 'solVaultBump', type: 'u8' },
        ],
      },
    },
  ],
  events: [
    {
      name: 'Trade',
      fields: [
        { name: 'mint', type: 'publicKey', index: false },
        { name: 'isBuy', type: 'bool', index: false },
        { name: 'user', type: 'publicKey', index: false },
        { name: 'solAmount', type: 'u64', index: false },
        { name: 'tokenAmount', type: 'u64', index: false },
        { name: 'virtualSolReserves', type: 'u64', index: false },
        { name: 'virtualTokenReserves', type: 'u64', index: false },
        { name: 'realSolReserves', type: 'u64', index: false },
        { name: 'realTokenReserves', type: 'u64', index: false },
        { name: 'timestamp', type: 'i64', index: false },
      ],
    },
    {
      name: 'PoolCreated',
      fields: [
        { name: 'mint', type: 'publicKey', index: false },
        { name: 'creator', type: 'publicKey', index: false },
        { name: 'name', type: 'string', index: false },
        { name: 'symbol', type: 'string', index: false },
        { name: 'uri', type: 'string', index: false },
        { name: 'timestamp', type: 'i64', index: false },
      ],
    },
  ],
  errors: [],
}
