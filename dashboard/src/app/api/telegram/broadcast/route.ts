import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET

const BROADCAST_MESSAGES = [
  {
    time: 'morning',
    text: `<b>🔴 [CLASSIFIED TRANSMISSION — FILE #0000] 🔴</b>\n\n<b>[SYSTEM ACTIVE]</b> The Redacted Protocol is LIVE on Solana.\n\n🎯 <b>Airdrop: 700 RDX per agent</b>\n📡 <b>40% of 1B supply allocated</b>\n⚡ <b>Earn XP → Earn more RDX</b>\n\n<i>"The official narrative is fracturing. Secure your access before the protocol locks down."</i>\n\n🔗 <b>Register now:</b> <a href="https://redacted.bond">redacted.bond</a>\n\n<b>[ DECLASSIFY YOUR WALLET ]</b>\n\n#Solana #RDX #Airdrop #RedactedProtocol`,
  },
  {
    time: 'afternoon',
    text: `<b>⚡ [AGENT BRIEFING — MIDDAY OVERRIDE] ⚡</b>\n\nThe protocol has been tracking agent activity. The censors are panicking.\n\n📋 <b>Quest Board Updated</b> — new missions available\n🏆 <b>Leaderboard</b> — top agents climbing ranks\n🔥 <b>Streak Bonuses</b> — daily check-ins rewarded\n\n<b>HOW TO MAXIMIZE YOUR EXTRACTION:</b>\n▸ Daily check-in: +25 XP\n▸ OCR scan a document: +50 XP\n▸ Refer an agent: +200 XP\n▸ 7-day streak: +500 XP bonus\n\n📡 <b>Dashboard:</b> <a href="https://redacted.bond/dashboard">redacted.bond/dashboard</a>\n\n#RedactedProtocol #Solana #RDX`,
  },
  {
    time: 'evening',
    text: `<b>🌑 [END OF DAY — ZERO-DAY DISPATCH] 🌑</b>\n\nAnother day of intelligence gathering complete. The truth belongs to the nodes.\n\nThe Redacted Protocol is an autonomous AI agent system.\n\n<b>OPERATIONAL SUMMARY:</b>\n🔍 <b>OCR Engine</b> — decode redacted documents\n🎨 <b>Image Generation</b> — create classified art\n📰 <b>News Intelligence</b> — scan encrypted feeds\n🏛️ <b>Colosseum Integration</b> — hackathon-ready\n\n<i><b>THE FILE IS BREATHING.</b></i>\n\nJoin the resistance: <a href="https://redacted.bond">redacted.bond</a>\n\n#Solana #Colosseum2026 #RedactedProtocol`,
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
      parse_mode: 'HTML',
      disable_web_page_preview: true,
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
