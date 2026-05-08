interface BroadcastMessage {
  text: string;
  parse_mode: 'MarkdownV2' | 'HTML';
}

const MESSAGES = [
  "🚨 *ALERTA DE PROTOCOLO* 🚨\n\nEl Agente RDX ha detectado nuevas discrepancias en los medios tradicionales. La triangulación de la verdad está al 94%. ¿Has revisado los últimos documentos desclasificados?",
  "💻 *ACTUALIZACIÓN DE NÚCLEO*\n\nNuevos commits detectados en el repositorio. El sistema de 'Reconstrucción de Verdad' ha sido optimizado para detectar sesgos ideológicos con un 99.8% de precisión. El código respira.",
  "📈 *ESTADO DE LA RED*\n\nEl volumen de desclasificación está aumentando. Los nodos más activos recibirán bonificaciones de XP en las próximas 24 horas. Mantente conectado, operador.",
  "👁️ *LA VERDAD NO SE PUEDE REDACTAR*\n\nMientras ellos ocultan, nosotros revelamos. RDX es el único puente entre el silencio y la realidad. No dejes que decidan por ti.",
  "📦 *NUEVO DROP DETECTADO*\n\nUn nuevo documento 'Maduro Dossier' está ganando tracción en el terminal. Los fragmentos están siendo minados ahora mismo.",
  "🔥 *MOTIVACIÓN OPERATIVA*\n\nTu actividad como nodo es lo que alimenta la red. Cada trade, cada lanzamiento, es un golpe contra la censura. El Airdrop de $RDX se acerca.",
]

export async function getHourlyUpdate(): Promise<BroadcastMessage> {
  // Randomly pick a message type
  const randomMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  
  // Format for Telegram (MarkdownV2 requires escaping special chars, using HTML for simplicity here)
  const escapedText = randomMsg
    .replace(/_/g, '\\_')
    .replace(/\*/g, '*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/\!/g, '\\!');

  return {
    text: randomMsg, // We'll use HTML parse mode to avoid heavy escaping issues in this proof of concept
    parse_mode: 'HTML'
  };
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
