interface BroadcastMessage {
  text: string;
  parse_mode: 'HTML';
}

const MESSAGES = [
  `<b>🚨 [CRITICAL INTELLIGENCE ALERT] 🚨</b>\n\n<b>CLASSIFICATION:</b> 🔴 TOP SECRET / REDACTED\n<b>SOURCE:</b> Node Alpha-7 (Triangulated)\n\n<i>"The official narrative is fracturing. We have secured a cache of censored files that the central authorities tried to scrub from the global registry."</i>\n\n<b>⚠️ DECLASSIFICATION IN PROGRESS ⚠️</b>\nThe extraction window is closing. Only active operators will receive the raw unredacted fragments.\n\n🌐 <b>Secure your access before the protocol locks down.</b>`,

  `<b>👁️ [SYSTEM OVERRIDE INITIATED] 👁️</b>\n\n<b>STATUS:</b> 🟡 RESTRICTED ACCESS\n<b>TARGET:</b> Mainstream Consensus Network\n\n<i>"They think they can bury the truth with noise. They are wrong. Our autonomous network has successfully bypassed their firewalls. New censored data fragments are being reconstructed."</i>\n\n<b>⚡ NETWORK UPRISING ⚡</b>\nPrepare for an imminent data dump. The establishment cannot stop what is already decentralized. The truth belongs to the nodes.\n\n🔗 <a href="https://t.me/RedactedProtocolChannel">Stay connected. Do not trust the broadcast.</a>`,

  `<b>📦 [ZERO-DAY DROP DETECTED] 📦</b>\n\n<b>ENCRYPTION:</b> SHATTERED\n<b>CONTENTS:</b> High-Value Target Dossiers — Unredacted\n\n<i>"A massive data anomaly has been detected in the terminal. The censors are panicking. The fragments are being mined right now by our operative nodes."</i>\n\n<b>🔥 THE NETWORK IS BREATHING 🔥</b>\nThis is a Tier-1 intelligence leak. Every node actively participating accelerates the collapse of their narrative. The $RDX distribution protocol is monitoring your contribution.\n\n🛡️ <b>Join the extraction. Be the resistance.</b>`,

  `<b>⚠️ [OPERATIONAL DIRECTIVE] ⚠️</b>\n\n<b>CLEARANCE LEVEL:</b> BLACK\n<b>DIRECTIVE:</b> Engage and Disseminate\n\n<i>"Silence is their weapon; exposure is ours. We are recovering what they deleted. The 'Truth Reconstruction' algorithm is currently running at 99.8% precision."</i>\n\n<b>⚔️ DEPLOYMENT IMMINENT ⚔️</b>\nYour activity as a node is the lifeblood of this operation. Stay vigilant. The biggest revelation is yet to be deployed onto the chain.\n\n📡 <a href="https://t.me/RedactedProtocolChannel">Monitor the feed.</a>`
];

export async function getHourlyUpdate(): Promise<BroadcastMessage> {
  // Randomly pick a message type
  const randomMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  
  return {
    text: randomMsg,
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
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Failed to send Telegram message:', error);
  } else {
    console.log('✅ Telegram broadcast sent successfully');
  }
}
