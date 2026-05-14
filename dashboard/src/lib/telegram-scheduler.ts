/**
 * Legacy scheduler — delegates to centralized broadcast-messages module.
 * Kept for backward compatibility with any code that imports from here.
 */
import { getMessageByHour, type BroadcastSet } from './broadcast-messages'

interface BroadcastMessage {
  text: string;
  parse_mode: 'HTML';
}

export async function getHourlyUpdate(): Promise<BroadcastMessage> {
  const hour = new Date().getUTCHours()
  const msg: BroadcastSet = getMessageByHour(hour)

  return {
    text: msg.telegram,
    parse_mode: 'HTML',
  }
}

export async function sendTelegramBroadcast(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('❌ Telegram credentials missing');
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Failed to send Telegram message:', error);
  } else {
    console.log('✅ Telegram broadcast sent successfully');
  }
}
