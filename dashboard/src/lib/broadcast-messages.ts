/**
 * Centralized message bank for Telegram & X (Twitter) broadcasts.
 *
 * Each message set has:
 *   - telegram: HTML-formatted rich text with inline share links
 *   - tweet:    Plain-text optimized for X (≤280 chars)
 *   - slot:     time-of-day hint ('morning' | 'afternoon' | 'evening')
 */

const SITE_URL = 'https://redacted.bond'

// ── Share deeplink builders ─────────────────────────────────────────────────
function tgShareLink(text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent(text)}`
}

function xShareLink(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

// ── Message Bank ────────────────────────────────────────────────────────────

export interface BroadcastSet {
  slot: 'morning' | 'afternoon' | 'evening'
  telegram: string
  tweet: string
}

export const BROADCAST_MESSAGES: BroadcastSet[] = [
  // ── MORNING ───────────────────────────────────────────────────────────────
  {
    slot: 'morning',
    telegram:
      `<b>☀️ Buenos días, agentes!</b>\n\n` +
      `¿Sabías que puedes convertir <b>cualquier documento</b> en un token en Solana?\n\n` +
      `📄 Sube tu archivo\n` +
      `🤖 La IA lo analiza automáticamente\n` +
      `🪙 Se crea un token SPL con bonding curve\n` +
      `📈 ¡Y la comunidad puede tradear!\n\n` +
      `Es así de fácil. Desde PDFs hasta imágenes, todo puede ser tokenizado.\n\n` +
      `<b>¿Tienes un documento interesante?</b> Tokenízalo hoy y compártelo con el mundo 🌍\n\n` +
      `🔗 <a href="${SITE_URL}">redacted.bond</a>\n\n` +
      `<b>📲 Comparte con tu gente:</b>\n` +
      `<a href="${tgShareLink('☀️ Acabo de descubrir Redacted Protocol — puedes tokenizar cualquier documento en Solana con IA. Pruébalo: ' + SITE_URL)}">📤 Compartir en Telegram</a>  ·  ` +
      `<a href="${xShareLink('☀️ Redacted Protocol te permite tokenizar cualquier documento en Solana con IA.\n\nPDFs, imágenes, lo que sea → token SPL con bonding curve.\n\nPruébalo: ' + SITE_URL + '\n\n#Solana #RDX #RedactedProtocol')}">𝕏 Postear en X</a>`,
    tweet:
      `☀️ ¿Tienes un documento interesante?\n\n` +
      `En Redacted Protocol puedes tokenizarlo en Solana con IA.\n\n` +
      `📄 Sube → 🤖 IA analiza → 🪙 Token SPL creado\n\n` +
      `Así de simple.\n\n` +
      `Pruébalo: ${SITE_URL}\n\n` +
      `#Solana #RDX #RedactedProtocol`,
  },

  // ── AFTERNOON ─────────────────────────────────────────────────────────────
  {
    slot: 'afternoon',
    telegram:
      `<b>🚀 ¡La comunidad sigue creciendo!</b>\n\n` +
      `Cada día más agentes están tokenizando sus documentos en Redacted Protocol.\n\n` +
      `<b>¿Qué puedes tokenizar?</b>\n` +
      `📰 Artículos y noticias\n` +
      `📑 Informes y reportes\n` +
      `🖼️ Imágenes y arte\n` +
      `📜 Documentos históricos\n` +
      `🔬 Papers e investigaciones\n\n` +
      `Cada archivo que tokenizas gana <b>XP</b> y sube tu posición en el <b>leaderboard</b> 🏆\n\n` +
      `<b>Gana puntos así:</b>\n` +
      `▸ Check-in diario: <code>+25 XP</code>\n` +
      `▸ Escanear documento: <code>+50 XP</code>\n` +
      `▸ Invitar a un amigo: <code>+200 XP</code>\n` +
      `▸ Racha de 7 días: <code>+500 XP</code>\n\n` +
      `🔗 <a href="${SITE_URL}/dashboard">redacted.bond/dashboard</a>\n\n` +
      `<b>📲 Comparte con tu gente:</b>\n` +
      `<a href="${tgShareLink('🚀 Estoy tokenizando documentos en Solana con Redacted Protocol — ganas XP y subes en el leaderboard. Únete: ' + SITE_URL)}">📤 Compartir en Telegram</a>  ·  ` +
      `<a href="${xShareLink('🚀 Tokenizando documentos en Solana con @RedactedProtocol.\n\nGanas XP, subes en el leaderboard, y tu archivo se convierte en un token tradeable.\n\nÚnete: ' + SITE_URL + '\n\n#Solana #RDX')}">𝕏 Postear en X</a>`,
    tweet:
      `🚀 La comunidad de Redacted Protocol sigue creciendo.\n\n` +
      `Tokeniza documentos en Solana:\n` +
      `📰 Artículos\n📑 Informes\n🖼️ Arte\n🔬 Papers\n\n` +
      `Cada archivo = XP + posición en el leaderboard 🏆\n\n` +
      `${SITE_URL}\n\n` +
      `#Solana #RDX #RedactedProtocol`,
  },

  // ── EVENING ───────────────────────────────────────────────────────────────
  {
    slot: 'evening',
    telegram:
      `<b>🌙 Resumen del día</b>\n\n` +
      `Otro gran día para la red de agentes.\n\n` +
      `<b>¿Todavía no has tokenizado tu primer documento?</b>\n` +
      `No te preocupes, es super fácil:\n\n` +
      `1️⃣ Conecta tu wallet en <a href="${SITE_URL}">redacted.bond</a>\n` +
      `2️⃣ Sube cualquier documento o imagen\n` +
      `3️⃣ La IA lo clasifica y genera el token\n` +
      `4️⃣ ¡Listo! Tu archivo ya es un token en Solana\n\n` +
      `Y lo mejor: recibes <b>700 $RDX gratis</b> en el airdrop solo por registrarte 🎁\n\n` +
      `<b>Herramientas disponibles:</b>\n` +
      `🔍 Motor OCR — extrae texto de imágenes\n` +
      `🎨 Generador de imágenes con IA\n` +
      `📰 Scanner de noticias\n` +
      `📈 Terminal de trading con bonding curve\n\n` +
      `🔗 <a href="${SITE_URL}">redacted.bond</a>\n\n` +
      `<b>📲 Comparte con tu gente:</b>\n` +
      `<a href="${tgShareLink('🌙 En Redacted Protocol recibes 700 $RDX gratis por registrarte y puedes tokenizar cualquier documento en Solana. Pruébalo: ' + SITE_URL)}">📤 Compartir en Telegram</a>  ·  ` +
      `<a href="${xShareLink('🌙 700 $RDX gratis solo por registrarte.\n\nRedacted Protocol te permite tokenizar cualquier documento en Solana con IA.\n\nOCR · Image Gen · Trading Terminal\n\nPruébalo: ' + SITE_URL + '\n\n#Solana #Airdrop #RDX')}">𝕏 Postear en X</a>`,
    tweet:
      `🌙 ¿Ya tokenizaste tu primer documento?\n\n` +
      `En Redacted Protocol es gratis empezar:\n` +
      `✅ 700 $RDX de airdrop\n` +
      `✅ IA clasifica tu archivo\n` +
      `✅ Token SPL automático\n` +
      `✅ Trading con bonding curve\n\n` +
      `Pruébalo: ${SITE_URL}\n\n` +
      `#Solana #RDX #Airdrop`,
  },
]

// ── Extra tweets (X-only rotation) ──────────────────────────────────────────

export const EXTRA_TWEETS: string[] = [
  `📄 ¿Tienes un PDF, un artículo, o una imagen interesante?\n\nConviértelo en un token en Solana con Redacted Protocol.\n\nLa IA lo analiza, crea el token, y la comunidad puede tradearlo.\n\n${SITE_URL}\n\n#Solana #RDX #RedactedProtocol`,

  `🤖 Tokenizar documentos con IA nunca fue tan fácil.\n\n1. Sube tu archivo\n2. La IA lo clasifica\n3. Se crea un token SPL\n4. Trading en vivo\n\nAsí funciona Redacted Protocol.\n\n${SITE_URL}\n\n#Solana #Web3 #AI`,

  `🎁 700 $RDX gratis por registrarte.\n40% del supply total para la comunidad.\n\nTokeniza documentos, gana XP, sube en el leaderboard.\n\nRedacted Protocol en Solana.\n\n${SITE_URL}\n\n#Solana #Airdrop #RDX`,

  `📈 Cada documento tokenizado tiene su propia bonding curve.\n\nEso significa que puedes tradear archivos como si fueran memecoins.\n\nPero con contenido real detrás.\n\nBienvenido a Redacted Protocol.\n\n${SITE_URL}\n\n#Solana #DeFi #RedactedProtocol`,

  `🏆 Los agentes más activos están subiendo en el leaderboard.\n\nCheck-in diario: +25 XP\nEscanear docs: +50 XP\nInvitar amigos: +200 XP\nRacha de 7 días: +500 XP\n\n¿Dónde estás tú?\n\n${SITE_URL}/dashboard\n\n#Solana #RDX`,
]

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getMessageByHour(utcHour: number): BroadcastSet {
  if (utcHour >= 6 && utcHour < 14) return BROADCAST_MESSAGES[0]   // morning
  if (utcHour >= 14 && utcHour < 20) return BROADCAST_MESSAGES[1]  // afternoon
  return BROADCAST_MESSAGES[2]                                      // evening
}

export function getRandomTweet(): string {
  const pool = [
    ...BROADCAST_MESSAGES.map(m => m.tweet),
    ...EXTRA_TWEETS,
  ]
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Pick tweet from the BroadcastSet matching the current time slot */
export function getTweetByHour(utcHour: number): string {
  return getMessageByHour(utcHour).tweet
}
