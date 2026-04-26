"use strict";
// Minimal IDL stub for rd-bondingcurve.
//
// After running `anchor build` in ../contracts/, replace the body below with
// the JSON at contracts/target/idl/rd_bondingcurve.json. The backend's
// log-listener + RPC calls will pick up the real instructions/events once the
// real IDL is in place. Keeping a typed stub so backend compiles now.
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    version: '0.1.0',
    name: 'rd_bondingcurve',
    instructions: [],
    accounts: [],
    events: [
        {
            name: 'TradeEvent',
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
        {
            name: 'PoolGraduated',
            fields: [
                { name: 'mint', type: 'publicKey', index: false },
                { name: 'realSolReserves', type: 'u64', index: false },
                { name: 'realTokenReserves', type: 'u64', index: false },
                { name: 'timestamp', type: 'i64', index: false },
            ],
        },
    ],
    errors: [],
};
