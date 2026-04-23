import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET

const BROADCAST_MESSAGES = [
  {
    time: 'morning',
    text: `🔴 *CLASSIFIED TRANSMISSION — FILE #0000*

\\[SYSTEM ACTIVE\\] The Redacted Protocol is LIVE on Solana\\.

🎯 *Airdrop: 700 RDX per agent*
📡 *40% of 1B supply allocated*
⚡ *Earn XP → Earn more RDX*

🔗 Register now: [redacted\\.bond](https://redacted.bond)

\\[ DECLASSIFY YOUR WALLET \\]

\\#Solana \\#RDX \\#Airdrop \\#RedactedProtocol`,
  },
  {
    time: 'afternoon',
    text: `⚡ *AGENT BRIEFING — MIDDAY UPDATE*

The protocol has been tracking agent activity\\. Here's what's happening:

📋 *Quest Board Updated* — new missions available
🏆 *Leaderboard* — top agents climbing ranks
🔥 *Streak Bonuses* — daily check\\-ins rewarded

*HOW TO MAXIMIZE YOUR RDX:*
▸ Daily check\\-in: \\+25 XP
▸ OCR scan a document: \\+50 XP
▸ Refer an agent: \\+200 XP
▸ 7\\-day streak: \\+500 XP bonus

📡 Dashboard: [redacted\\.bond/dashboard](https://redacted.bond/dashboard)

\\#RedactedProtocol \\#Solana \\#RDX`,
  },
  {
    time: 'evening',
    text: `🌑 *END OF DAY — CLASSIFIED DISPATCH*

Another day of intelligence gathering complete\\.

The Redacted Protocol is an autonomous AI agent system built on Solana for the 2026 Colosseum Hackathon\\.

What we do:
🔍 *OCR Engine* — decode redacted documents
🎨 *Image Generation* — create classified art
📰 *News Intelligence* — scan encrypted feeds
🏛️ *Colosseum Integration* — hackathon\\-ready

*THE FILE IS BREATHING\\.*

Join the mission: [redacted\\.bond](https://redacted.bond)

\\#Solana \\#Colosseum2026 \\#RedactedProtocol \\#Web3`,
  },
]

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
    }),
  })
  return res.json()
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!BOT_TOKEN || !CHANNEL_ID) {
    return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID' }, { status: 500 })
  }

  const hour = new Date().getUTCHours()
  let messageIndex = 0
  if (hour >= 9 && hour < 15) messageIndex = 0
  else if (hour >= 15 && hour < 21) messageIndex = 1
  else messageIndex = 2

  const message = BROADCAST_MESSAGES[messageIndex]

  try {
    const result = await sendTelegramMessage(CHANNEL_ID, message.text)
    if (result.ok) {
      return NextResponse.json({
        success: true,
        time: message.time,
        messageId: result.result?.message_id,
      })
    }
    return NextResponse.json({ success: false, error: result.description }, { status: 500 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

// Manual POST for testing
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!BOT_TOKEN || !CHANNEL_ID) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const text = body.text || BROADCAST_MESSAGES[0].text

  try {
    const result = await sendTelegramMessage(CHANNEL_ID, text)
    return NextResponse.json({ success: result.ok, result })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
