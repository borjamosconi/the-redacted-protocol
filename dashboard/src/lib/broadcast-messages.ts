import { SITE_URL, labeledLink, sectionTitle, tgShareLink, xShareLink } from './telegram-format'

/**
 * Centralized message bank for Telegram & X broadcasts.
 *
 * Telegram messages use HTML and keep every link labeled so the reader knows
 * exactly what each URL is for before opening it.
 */

export interface BroadcastSet {
  slot: 'morning' | 'afternoon' | 'evening'
  telegram: string
  tweet: string
}

export const BROADCAST_MESSAGES: BroadcastSet[] = [
  {
    slot: 'morning',
    telegram:
      `☀️ <b>[ OPERATOR_NOTICE ] ─── SECUENCIA: GM</b>\n\n` +
      `<i>"La información quiere ser libre. Las cadenas que impone el secreto solo se rompen descifrando el código línea a línea. Tu mente es el terminal, tu voluntad el descifrador. Sal ahí fuera y expón la verdad hoy."</i>\n\n` +
      `${sectionTitle('Redacted Protocol: tokeniza documentos en Solana')}\n\n` +
      `Puedes subir un PDF, una imagen, una captura o un informe. La IA analiza el contenido y crea un activo digital basado en esa informacion.\n\n` +
      `${sectionTitle('Como funciona:')}\n` +
      `1. Subes el archivo o pegas un enlace.\n` +
      `2. La IA extrae los datos importantes.\n` +
      `3. Se crea un token SPL con curva de precio.\n\n` +
      `${sectionTitle('Enlaces:')}\n` +
      `${labeledLink('Terminal para subir o analizar documentos', `${SITE_URL}/terminal`)}\n` +
      `${labeledLink('Web principal del proyecto', SITE_URL)}\n` +
      `${labeledLink('Compartir este mensaje en Telegram', tgShareLink('Redacted Protocol permite tokenizar documentos en Solana con IA. Pruebalo aqui: ' + SITE_URL))}\n` +
      `${labeledLink('Publicar en X', xShareLink('Redacted Protocol permite tokenizar documentos en Solana con IA.\n\nSube un archivo, deja que la IA lo analice y crea un token SPL.\n\nPruebalo: ' + SITE_URL + '/terminal\n\n#Solana #RDX #AI'))}`,
    tweet:
      `Tienes un documento con informacion valiosa?\n\n` +
      `En Redacted Protocol puedes tokenizarlo en Solana usando IA.\n\n` +
      `Sube archivo -> IA analiza -> token SPL creado\n\n` +
      `${SITE_URL}/terminal\n\n` +
      `#Solana #RDX #AI`,
  },
  {
    slot: 'afternoon',
    telegram:
      `${sectionTitle('Gana XP participando en Redacted Protocol')}\n\n` +
      `Cada accion dentro del protocolo suma experiencia. Esa actividad ayuda a mejorar tu posicion en el ranking y tu participacion en la comunidad.\n\n` +
      `${sectionTitle('Acciones que suman XP:')}\n` +
      `- Registro diario: <code>+25 XP</code>\n` +
      `- Escanear un documento: <code>+50 XP</code>\n` +
      `- Invitar a nuevos usuarios: <code>+200 XP</code>\n\n` +
      `${sectionTitle('Enlaces:')}\n` +
      `${labeledLink('Dashboard para ver XP, misiones y ranking', `${SITE_URL}/dashboard`)}\n` +
      `${labeledLink('Terminal para subir documentos', `${SITE_URL}/terminal`)}\n` +
      `${labeledLink('Compartir invitacion en Telegram', tgShareLink('Estoy usando Redacted Protocol para tokenizar informacion en Solana y ganar XP. Unete aqui: ' + SITE_URL))}\n` +
      `${labeledLink('Publicar invitacion en X', xShareLink('Estoy usando Redacted Protocol para tokenizar informacion en Solana y ganar XP.\n\nUnete: ' + SITE_URL + '\n\n#Solana #RDX'))}`,
    tweet:
      `La comunidad de Redacted Protocol sigue creciendo.\n\n` +
      `Tokeniza articulos, informes o documentos en Solana. Gana XP por cada aportacion y sube en el ranking.\n\n` +
      `${SITE_URL}/dashboard\n\n` +
      `#Solana #RDX #Web3`,
  },
  {
    slot: 'evening',
    telegram:
      `🌙 <b>[ OPERATOR_NOTICE ] ─── SECUENCIA: GN</b>\n\n` +
      `<i>"Apagando terminales primarios. Entrando en modo de escucha de baja frecuencia. Descansa, operador. La verdad no duerme, pero tus ojos sí. Mañana continuaremos reconstruyendo los fragmentos."</i>\n\n` +
      `${sectionTitle('Airdrop y herramientas principales de Redacted Protocol')}\n\n` +
      `Si aun no has empezado, puedes registrar tu wallet, revisar tus misiones y probar el analisis de documentos desde el dashboard.\n\n` +
      `${sectionTitle('Pasos recomendados:')}\n` +
      `1. Conecta tu wallet de Solana.\n` +
      `2. Revisa tu estado de airdrop y XP.\n` +
      `3. Sube un documento o pega un enlace para analizarlo con IA.\n\n` +
      `${sectionTitle('Enlaces:')}\n` +
      `${labeledLink('Registro y estado del airdrop', `${SITE_URL}/dashboard`)}\n` +
      `${labeledLink('Terminal de documentos y trading', `${SITE_URL}/terminal`)}\n` +
      `${labeledLink('Web principal', SITE_URL)}\n` +
      `${labeledLink('Compartir airdrop en Telegram', tgShareLink('Redacted Protocol permite registrar tu wallet, ganar XP y tokenizar documentos en Solana. Entra aqui: ' + SITE_URL))}\n` +
      `${labeledLink('Publicar airdrop en X', xShareLink('Redacted Protocol permite registrar tu wallet, ganar XP y tokenizar documentos en Solana con IA.\n\nEntra aqui: ' + SITE_URL + '\n\n#Solana #Airdrop #RDX'))}`,
    tweet:
      `Ya revisaste tu airdrop de $RDX?\n\n` +
      `Conecta tu wallet, gana XP y tokeniza documentos en Solana con IA.\n\n` +
      `${SITE_URL}/dashboard\n\n` +
      `#Solana #RDX #Airdrop`,
  },
]

export const EXTRA_TWEETS: string[] = [
  `Convierte documentos en activos digitales en Solana. La IA analiza PDFs, imagenes y enlaces para crear tokens SPL automaticos.\n\n${SITE_URL}/terminal\n\n#Solana #RDX #AI`,
  `Tokenizacion de documentos en 3 pasos:\n\n1. Sube tu archivo\n2. La IA analiza el contenido\n3. Se crea el token\n\n${SITE_URL}/terminal\n\n#Solana #Web3 #Crypto`,
  `No pierdas tu asignacion de $RDX. Registra tu wallet, completa misiones y suma XP dentro de Redacted Protocol.\n\n${SITE_URL}/dashboard\n\n#Solana #Airdrop #RDX`,
  `Cada documento tokenizado puede tener su propia curva de precio. Redacted Protocol convierte informacion en activos de datos.\n\n${SITE_URL}/terminal\n\n#Solana #DeFi #AI`,
  `Los usuarios mas activos lideran la red.\n\nCheck-in diario: +25 XP\nEscanear docs: +50 XP\nInvitar usuarios: +200 XP\n\n${SITE_URL}/dashboard\n\n#Solana #RDX`,
]

export function getMessageByHour(utcHour: number): BroadcastSet {
  if (utcHour >= 6 && utcHour < 14) return BROADCAST_MESSAGES[0]
  if (utcHour >= 14 && utcHour < 20) return BROADCAST_MESSAGES[1]
  return BROADCAST_MESSAGES[2]
}

export function getRandomTweet(): string {
  const pool = [
    ...BROADCAST_MESSAGES.map(m => m.tweet),
    ...EXTRA_TWEETS,
  ]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getTweetByHour(utcHour: number): string {
  return getMessageByHour(utcHour).tweet
}
