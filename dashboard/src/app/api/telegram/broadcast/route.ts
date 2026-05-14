import { NextRequest, NextResponse } from 'next/server'
import { getMessageByHour, BROADCAST_MESSAGES } from '@/lib/broadcast-messages'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false, // allow link previews for shareability
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
  const message = getMessageByHour(hour)

  try {
    const result = await sendTelegramMessage(CHANNEL_ID, message.telegram)
    if (result.ok) {
      return NextResponse.json({
        success: true,
        slot: message.slot,
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
  const text = body.text || BROADCAST_MESSAGES[0].telegram

  try {
    const result = await sendTelegramMessage(CHANNEL_ID, text)
    return NextResponse.json({ success: result.ok, result })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
