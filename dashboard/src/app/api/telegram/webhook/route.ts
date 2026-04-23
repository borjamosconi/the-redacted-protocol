import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

const COMMANDS: Record<string, string> = {
  '/start': `🔴 *REDACTED PROTOCOL — AGENT BRIEFING*

Welcome, agent\\. You've accessed the classified network\\.

*$RDX — The Redacted Protocol*
Built on Solana for Colosseum Hackathon 2026\\.

*AVAILABLE COMMANDS:*
/airdrop — Register for 700 RDX airdrop
/dashboard — Access your agent dashboard
/stats — View protocol statistics
/quests — Available missions
/help — Show this menu

🔗 [redacted\\.bond](https://redacted.bond)

\\[ THE FILE IS BREATHING \\]`,

  '/airdrop': `🎯 *AIRDROP REGISTRATION*

📦 *Allocation:* 700 RDX per agent
📊 *Pool:* 400M RDX \\(40% of total supply\\)
⚡ *Bonus:* earn more XP → earn more RDX

*HOW TO REGISTER:*
1\\. Visit [redacted\\.bond/\\#airdrop](https://redacted.bond/#airdrop)
2\\. Connect your Solana wallet
3\\. Enter your Telegram ID
4\\. Confirm registration

*EARN BONUS RDX:*
▸ Daily check\\-in: \\+25 XP
▸ OCR scan: \\+50 XP
▸ Refer agents: \\+200 XP each
▸ 7\\-day streak: \\+500 XP

Register: [redacted\\.bond](https://redacted.bond)`,

  '/dashboard': `📊 *AGENT DASHBOARD*

Access your classified intelligence file at:
🔗 [redacted\\.bond/dashboard](https://redacted.bond/dashboard)

*YOUR DASHBOARD INCLUDES:*
▸ XP & level progression
▸ Airdrop allocation tracker
▸ Daily check\\-in streaks
▸ Quest completion board
▸ Referral analytics

Connect your Solana wallet to access full features\\.`,

  '/stats': `📡 *PROTOCOL STATISTICS*

*$RDX Token:*
▸ Total Supply: 1,000,000,000 RDX
▸ Airdrop Pool: 400M RDX \\(40%\\)
▸ Staking APY: ~50%
▸ Network: Solana

*Technical Stack:*
▸ ~12,000 lines of Rust
▸ 6 smart contracts
▸ Zero\\-knowledge proofs
▸ Autonomous AI agents

*Links:*
🌐 [redacted\\.bond](https://redacted.bond)
📱 [@theredacted\\_bot](https://t.me/theredacted_bot)`,

  '/quests': `⚔️ *ACTIVE MISSIONS*

Complete quests to earn XP and bonus RDX:

*DAILY MISSIONS:*
📅 Daily Check\\-in — 25 XP
🔍 OCR Document Scan — 50 XP
📰 News Intelligence — 30 XP
🎨 Generate Image — 40 XP

*WEEKLY MISSIONS:*
🔥 7\\-Day Streak — 500 XP bonus
👥 Refer 3 Agents — 600 XP
📋 Complete 10 Scans — 300 XP

*MILESTONE MISSIONS:*
🏆 First OCR Scan — 100 XP
🌐 Connect Wallet — 50 XP
📡 Telegram Link — 75 XP

Access quests: [redacted\\.bond/dashboard](https://redacted.bond/dashboard)`,

  '/help': `ℹ️ *HELP — REDACTED PROTOCOL BOT*

*COMMANDS:*
/start — Welcome briefing
/airdrop — Airdrop info & registration
/dashboard — Access your dashboard
/stats — Protocol statistics
/quests — Available missions
/help — This help menu

*LINKS:*
🌐 Website: [redacted\\.bond](https://redacted.bond)
💻 GitHub: [whalesconspiracy\\-33](https://github.com/whalesconspiracy-33/the-redacted-protocol)

*SUPPORT:*
Message in this chat for support\\.

\\#RedactedProtocol \\#Solana \\#RDX`,
}

async function sendMessage(chatId: number | string, text: string, replyToMessageId?: number) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
      ...(replyToMessageId && { reply_to_message_id: replyToMessageId }),
    }),
  })
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; username?: string; first_name?: string }
    chat: { id: number; type: string; title?: string }
    text?: string
    date: number
  }
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'No bot token' }, { status: 500 })
  }

  try {
    const update: TelegramUpdate = await req.json()
    const message = update.message
    if (!message?.text) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text.trim()

    // Handle /command@botname format
    const command = text.split('@')[0].split(' ')[0].toLowerCase()

    if (COMMANDS[command]) {
      await sendMessage(chatId, COMMANDS[command], message.message_id)
      return NextResponse.json({ ok: true })
    }

    // Handle non-command messages — intelligent auto-reply
    const lowerText = text.toLowerCase()
    let reply: string | null = null

    if (lowerText.includes('airdrop') || lowerText.includes('rdx') || lowerText.includes('token')) {
      reply = COMMANDS['/airdrop']
    } else if (lowerText.includes('dashboard') || lowerText.includes('login') || lowerText.includes('wallet')) {
      reply = COMMANDS['/dashboard']
    } else if (lowerText.includes('quest') || lowerText.includes('mission') || lowerText.includes('xp')) {
      reply = COMMANDS['/quests']
    } else if (lowerText.includes('stat') || lowerText.includes('supply') || lowerText.includes('token')) {
      reply = COMMANDS['/stats']
    } else if (lowerText.includes('help') || lowerText.includes('?') || lowerText.includes('how')) {
      reply = COMMANDS['/help']
    }

    if (reply) {
      await sendMessage(chatId, reply, message.message_id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// GET for webhook verification / setup
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const setup = searchParams.get('setup')

  if (setup && BOT_TOKEN) {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://redacted.bond'}/api/telegram/webhook`
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: WEBHOOK_SECRET || undefined,
          allowed_updates: ['message'],
        }),
      }
    )
    const data = await res.json()
    return NextResponse.json(data)
  }

  return NextResponse.json({
    status: 'webhook active',
    commands: Object.keys(COMMANDS),
  })
}
