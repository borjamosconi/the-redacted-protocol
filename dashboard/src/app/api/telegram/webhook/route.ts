import { NextRequest, NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/telegram-format'
import { TELEGRAM_COMMANDS } from '@/lib/telegram-command-messages'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

async function sendMessage(chatId: number | string, text: string, replyToMessageId?: number) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
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
    const command = text.split('@')[0].split(' ')[0].toLowerCase()

    if (TELEGRAM_COMMANDS[command]) {
      await sendMessage(chatId, TELEGRAM_COMMANDS[command], message.message_id)
      return NextResponse.json({ ok: true })
    }

    const lowerText = text.toLowerCase()
    let reply: string | null = null

    if (lowerText.includes('airdrop') || lowerText.includes('rdx') || lowerText.includes('token')) {
      reply = TELEGRAM_COMMANDS['/airdrop']
    } else if (lowerText.includes('dashboard') || lowerText.includes('login') || lowerText.includes('wallet')) {
      reply = TELEGRAM_COMMANDS['/dashboard']
    } else if (lowerText.includes('quest') || lowerText.includes('mission') || lowerText.includes('xp')) {
      reply = TELEGRAM_COMMANDS['/quests']
    } else if (lowerText.includes('stat') || lowerText.includes('supply')) {
      reply = TELEGRAM_COMMANDS['/stats']
    } else if (lowerText.includes('help') || lowerText.includes('?') || lowerText.includes('how')) {
      reply = TELEGRAM_COMMANDS['/help']
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const setup = searchParams.get('setup')

  if (setup && BOT_TOKEN) {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || SITE_URL}/api/telegram/webhook`
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
    commands: Object.keys(TELEGRAM_COMMANDS),
  })
}
