import { NextRequest, NextResponse } from 'next/server'

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

const DAILY_TWEETS = [
  `🚨 CLASSIFIED LEAK 🚨\n\nThe central authorities thought they could scrub the registry. They were wrong. The Redacted Protocol is actively mining the truth.\n\nAre you a node in the resistance or part of the silence?\n\n👁️ Declassify now: https://redacted.bond\n#Solana #RDX`,
  
  `⚡ SYSTEM OVERRIDE ⚡\n\nThe consensus narrative is fracturing. Our autonomous network has bypassed the firewalls. \n\nEvery agent that joins strengthens the triangulation. The $RDX protocol is watching.\n\n🛡️ Join the extraction: https://redacted.bond\n#RedactedProtocol #Web3`,
  
  `🌑 ZERO-DAY DISPATCH 🌑\n\nThe file is breathing.\n\nWhile they redact, we reconstruct. A massive data anomaly has been detected. Only active operators will receive the unredacted fragments.\n\n🔗 Secure your access: https://redacted.bond\n#Solana #Colosseum2026`
]

async function sendTwitterBroadcast(text: string) {
  const url = `https://api.twitter.com/2/tweets`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
    },
    body: JSON.stringify({ text }),
  })
  return res.json()
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!TWITTER_BEARER_TOKEN) {
    return NextResponse.json({ error: 'Missing TWITTER_BEARER_TOKEN' }, { status: 500 })
  }

  // Select a random tweet from our high-impact list
  const text = DAILY_TWEETS[Math.floor(Math.random() * DAILY_TWEETS.length)]

  try {
    const result = await sendTwitterBroadcast(text)
    if (result.data && result.data.id) {
      return NextResponse.json({
        success: true,
        tweetId: result.data.id,
      })
    }
    return NextResponse.json({ success: false, error: result.detail || 'Twitter API error' }, { status: 500 })
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

  if (!TWITTER_BEARER_TOKEN) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const text = body.text || DAILY_TWEETS[0]

  try {
    const result = await sendTwitterBroadcast(text)
    return NextResponse.json({ success: !!(result.data && result.data.id), result })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
