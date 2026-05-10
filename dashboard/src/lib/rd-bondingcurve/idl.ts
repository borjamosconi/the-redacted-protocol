export type BondingCurveIDL = any;

export const IDL: BondingCurveIDL = {
  "address": "2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg",
  "metadata": {
    "name": "rd_bondingcurve",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "RDX Bonding Curve — pump.fun-style launchpad program"
  },
  "instructions": [
    {
      "name": "buy",
      "docs": [
        "Buy `tokens_out` (minimum) for `sol_in` lamports. 98.5% of `sol_in`",
        "enters the pool reserves, 1% goes to treasury, 0.5% to creator."
      ],
      "discriminator": [
        102,
        6,
        61,
        18,
        1,
        218,
        235,
        234
      ],
      "accounts": [
        {
          "name": "global"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "token_vault",
          "writable": true
        },
        {
          "name": "sol_vault",
          "writable": true
        },
        {
          "name": "buyer_token_account",
          "writable": true
        },
        {
          "name": "user_stats",
          "writable": true
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "creator_wallet",
          "writable": true
        },
        {
          "name": "referrer",
          "writable": true
        },
        {
          "name": "system_program"
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program"
        },
        {
          "name": "rent"
        }
      ],
      "args": [
        {
          "name": "sol_in",
          "type": "u64"
        },
        {
          "name": "min_tokens_out",
          "type": "u64"
        },
        {
          "name": "referral",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "create_pool",
      "docs": [
        "Create a new pool for a freshly-minted SPL token. The caller's wallet",
        "must already be the mint authority for `mint`. After this call the",
        "mint authority is transferred to the pool PDA so the curve controls",
        "supply; `INITIAL_REAL_TOKEN_RESERVES` tokens are minted into the pool",
        "token vault."
      ],
      "discriminator": [
        233,
        146,
        209,
        142,
        207,
        104,
        64,
        188
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "token_vault",
          "writable": true
        },
        {
          "name": "sol_vault",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program"
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program"
        },
        {
          "name": "rent"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "emergency_pause_admin",
      "discriminator": [
        73,
        38,
        38,
        38,
        102,
        64,
        246,
        131
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true
        },
        {
          "name": "emergency_admin",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "emergency_withdraw",
      "discriminator": [
        239,
        45,
        203,
        64,
        150,
        73,
        218,
        92
      ],
      "accounts": [
        {
          "name": "global"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "sol_vault",
          "writable": true
        },
        {
          "name": "user_token_account",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program"
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program"
        }
      ],
      "args": [
        {
          "name": "tokens_in",
          "type": "u64"
        }
      ]
    },
    {
      "name": "graduate",
      "discriminator": [
        122,
        48,
        236,
        110,
        136,
        14,
        179,
        101
      ],
      "accounts": [
        {
          "name": "global"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "token_vault",
          "writable": true
        },
        {
          "name": "sol_vault",
          "writable": true
        },
        {
          "name": "migration_authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "migration_token_account",
          "writable": true
        },
        {
          "name": "system_program"
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program"
        },
        {
          "name": "rent"
        }
      ],
      "args": []
    },
    {
      "name": "initialize_global",
      "discriminator": [
        134,
        61,
        104,
        29,
        132,
        25,
        110,
        24
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury"
        },
        {
          "name": "migration_authority"
        },
        {
          "name": "system_program"
        }
      ],
      "args": []
    },
    {
      "name": "sell",
      "docs": [
        "Sell `tokens_in` for SOL. Same fee logic: 1% to treasury, 0.5% to creator."
      ],
      "discriminator": [
        51,
        230,
        133,
        164,
        1,
        127,
        131,
        173
      ],
      "accounts": [
        {
          "name": "global"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "token_vault",
          "writable": true
        },
        {
          "name": "sol_vault",
          "writable": true
        },
        {
          "name": "seller_token_account",
          "writable": true
        },
        {
          "name": "user_stats",
          "writable": true
        },
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "creator_wallet",
          "writable": true
        },
        {
          "name": "referrer",
          "writable": true
        },
        {
          "name": "system_program"
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program"
        }
      ],
      "args": [
        {
          "name": "tokens_in",
          "type": "u64"
        },
        {
          "name": "min_sol_out",
          "type": "u64"
        }
      ]
    },
    {
      "name": "set_params",
      "discriminator": [
        27,
        102,
        38,
        225,
        120,
        132,
        254,
        91
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "fee_bps",
          "type": "u64"
        },
        {
          "name": "creator_fee_bps",
          "type": "u64"
        },
        {
          "name": "migration_authority",
          "type": "pubkey"
        },
        {
          "name": "emergency_admin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "set_paused",
      "discriminator": [
        14,
        133,
        159,
        167,
        149,
        34,
        12,
        24
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "GlobalState",
      "discriminator": [
        167,
        198,
        127,
        10,
        71,
        160,
        95,
        181
      ]
    },
    {
      "name": "PoolState",
      "discriminator": [
        247,
        237,
        227,
        245,
        215,
        195,
        222,
        70
      ]
    },
    {
      "name": "UserStats",
      "discriminator": [
        176,
        223,
        134,
        239,
        155,
        210,
        229,
        91
      ]
    }
  ],
  "events": [
    {
      "name": "EmergencyWithdrawEvent",
      "discriminator": [
        156,
        45,
        5,
        109,
        35,
        2,
        253,
        154
      ]
    },
    {
      "name": "GlobalInitialized",
      "discriminator": [
        197,
        224,
        50,
        166,
        187,
        49,
        110,
        11
      ]
    },
    {
      "name": "LpLocked",
      "discriminator": [
        141,
        212,
        47,
        222,
        16,
        174,
        151,
        146
      ]
    },
    {
      "name": "PauseToggled",
      "discriminator": [
        199,
        120,
        228,
        30,
        8,
        215,
        24,
        107
      ]
    },
    {
      "name": "PoolCreated",
      "discriminator": [
        69,
        21,
        151,
        168,
        153,
        138,
        97,
        11
      ]
    },
    {
      "name": "PoolGraduated",
      "discriminator": [
        225,
        197,
        113,
        194,
        6,
        247,
        210,
        202
      ]
    },
    {
      "name": "PoolMigrated",
      "discriminator": [
        6,
        4,
        159,
        8,
        225,
        132,
        64,
        63
      ]
    },
    {
      "name": "TradeEvent",
      "discriminator": [
        167,
        123,
        171,
        194,
        12,
        122,
        247,
        125
      ]
    }
  ],
  "types": [
    {
      "name": "BondingCurveError",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Paused"
          },
          {
            "name": "NotAdmin"
          },
          {
            "name": "NotMigrationAuthority"
          },
          {
            "name": "NotEmergencyAdmin"
          },
          {
            "name": "InvalidFee"
          },
          {
            "name": "PoolAlreadyComplete"
          },
          {
            "name": "PoolNotComplete"
          },
          {
            "name": "AlreadyMigrated"
          },
          {
            "name": "SlippageExceeded"
          },
          {
            "name": "InsufficientLiquidity"
          },
          {
            "name": "InsufficientFunds"
          },
          {
            "name": "Overflow"
          },
          {
            "name": "InvalidReserves"
          },
          {
            "name": "EmergencyTimelockActive"
          }
        ]
      }
    }
  ]
};
