/**
 * POST /api/agent/launch
 *
 * Called by the autonomous Rust agent to launch a document token.
 * Auth: Authorization: Bearer <AGENT_SECRET>
 *
 * Body: { name, symbol, description?, category?, image_url?, source_url?, confidence? }
 * Returns: { ok, mint, terminal_url, telegram_sent, on_chain }
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import {
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token'
import bs58 from 'bs58'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

const KEY_INDEX  = 'rdx:tokens'
const KEY_TOKEN  = (m: string) => `rdx:token:${m}`
const KEY_SOLD   = (m: string) => `rdx:bc:${m}:sold`
const KEY_SOL    = (m: string) => `rdx:bc:${m}:sol`
const KEY_BUYERS = (m: string) => `rdx:bc:${m}:buyers`
const MAX_SUPPLY_BC = 800_000_000

const CATEGORY_EMOJIS: Record<string, string> = {
  CLASSIFIED:   '🔴',
  LEAKED:       '🟡',
  REDACTED:     '🟠',
  DECLASSIFIED: '🟢',
  SUPPRESSED:   '🟣',
  CENSORED:     '🩷',
}

export async function POST(req: NextRequest) {
  // ── Auth ──
  const agentSecret = process.env.AGENT_SECRET
  if (!agentSecret) {
    return NextResponse.json({ error: 'AGENT_SECRET not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (token !== agentSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Body ──
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    name,
    symbol,
    description = '',
    category    = 'CLASSIFIED',
    image_url   = '',
    source_url  = '',
    confidence  = 75,
  } = body

  if (!name || !symbol) {
    return NextResponse.json({ error: 'name and symbol required' }, { status: 400 })
  }

  const ticker = String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)

  // ── Deduplicate by symbol ──
  const existingMint = await redis.get<string>(`rdx:symbol:${ticker}`)
  if (existingMint) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      mint: existingMint,
      terminal_url: `https://redacted.bond/terminal/${existingMint}`,
    })
  }

  // ── On-chain SPL mint ──
  const RPC_URL   = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY

  let mint = ''
  let launchTxSignature = ''
  let onChain = false

  if (ADMIN_KEY) {
    try {
      const adminKeypair = Keypair.fromSecretKey(bs58.decode(ADMIN_KEY))
      const mintKeypair  = Keypair.generate()
      const connection   = new Connection(RPC_URL, 'confirmed')

      const lamports = await getMinimumBalanceForRentExemptMint(connection)
      const ata = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        adminKeypair.publicKey
      )
      const totalSupply = BigInt(1_000_000_000) * BigInt(10 ** 9)

      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey:     adminKeypair.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          lamports,
          space:          MINT_SIZE,
          programId:      TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey, 9,
          adminKeypair.publicKey,
          adminKeypair.publicKey,
          TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
          adminKeypair.publicKey, ata,
          adminKeypair.publicKey, mintKeypair.publicKey
        ),
        createMintToInstruction(
          mintKeypair.publicKey, ata,
          adminKeypair.publicKey, totalSupply
        )
      )

      const sig = await sendAndConfirmTransaction(
        connection, tx,
        [adminKeypair, mintKeypair],
        { commitment: 'confirmed' }
      )

      mint             = mintKeypair.publicKey.toBase58()
      launchTxSignature = sig
      onChain          = true
      console.log(`[AgentLaunch] ✅ Minted: ${mint} tx=${sig}`)
    } catch (err: any) {
      console.error('[AgentLaunch] On-chain failed, using simulated mint:', err.message)
      mint = Keypair.generate().publicKey.toBase58()
    }
  } else {
    mint = Keypair.generate().publicKey.toBase58()
  }

  // ── Logo URL ──
  const logo = image_url || `https://image.pollinations.ai/prompt/${encodeURIComponent(
    `${name} classified document fragment dark cyberpunk redacted 8k photorealistic ultra-detailed cinematic lighting`
  )}`

  // ── Register to Redis ──
  const meta = {
    mint,
    name:           String(name).trim(),
    symbol:         ticker,
    description:    String(description).trim() || `Autonomous agent detection: ${name}`,
    logo,
    creator:        process.env.NEXT_PUBLIC_RDX_MAIN_AUTHORITY || 'HjqNchH7bsvgi1gSo9m3wbUasmQT1TaaRbJduDQ5uyPw',
    createdAt:      Date.now(),
    twitterUrl:     '',
    websiteUrl:     source_url,
    totalSupply:    1_000_000_000,
    decimals:       9,
    maxSupplyCurve: MAX_SUPPLY_BC,
    launchFee:      0.02,
    launchTxSignature,
    agentLaunched:  true,
    category,
    confidence,
  }

  const pipe = redis.pipeline()
  pipe.hset(KEY_TOKEN(mint), meta as any)
  pipe.zadd(KEY_INDEX, { score: meta.createdAt, member: mint })
  pipe.set(KEY_SOLD(mint),   0)
  pipe.set(KEY_SOL(mint),    0)
  pipe.set(KEY_BUYERS(mint), 0)
  pipe.set(`rdx:symbol:${ticker}`, mint)
  await pipe.exec()

  const terminalUrl = `https://redacted.bond/terminal/${mint}`
  const emoji = CATEGORY_EMOJIS[category] ?? '⚫'

  // ── Telegram broadcast ──
  let telegramSent = false
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID

  if (botToken && chatId) {
    try {
      // Escape special chars for MarkdownV2
      const safeName = String(name).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
      const msg =
        `${emoji} *AGENT AUTO\\-LAUNCH*\n\n` +
        `📄 *${safeName}*\n` +
        `🏷️ \\$${ticker} \\| ${category}\n` +
        `🔬 Confidence: ${confidence}%\n` +
        (source_url ? `🔗 [Source](${source_url})\n` : '') +
        `\n⛓️ \`${mint}\`\n` +
        `\n🚀 [Trade \\$${ticker}](${terminalUrl})\n\n` +
        `_The file is breathing\\._`

      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: 'MarkdownV2',
            disable_web_page_preview: false,
          }),
        }
      )
      telegramSent = tgRes.ok
      if (!tgRes.ok) console.error('[AgentLaunch] Telegram error:', await tgRes.text())
    } catch (e) {
      console.error('[AgentLaunch] Telegram exception:', e)
    }
  }

  return NextResponse.json({
    ok:            true,
    mint,
    symbol:        ticker,
    name,
    terminal_url:  terminalUrl,
    telegram_sent: telegramSent,
    on_chain:      onChain,
    tx_signature:  launchTxSignature || null,
  })
}
