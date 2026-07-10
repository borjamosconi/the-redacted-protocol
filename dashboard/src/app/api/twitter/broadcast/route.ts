import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { getRandomTweet } from '@/lib/broadcast-messages'
import fs from 'fs'
import path from 'path'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Build an authenticated Twitter client using OAuth 1.0a user-context tokens.
 * This is required for posting tweets (write operations).
 * The Bearer token alone only supports read-only app-context endpoints.
 */
function getTwitterClient() {
  const appKey = process.env.TWITTER_CONSUMER_KEY
  const appSecret = process.env.TWITTER_CONSUMER_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return null
  }

  return new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  })
}

async function postTweet(client: TwitterApi, text: string) {
  try {
    // Pick a random image from art-1 to art-5
    const imgIndex = Math.floor(Math.random() * 5) + 1
    const imgExt = imgIndex === 1 ? 'png' : 'jpg'
    const imgPath = path.join(process.cwd(), 'public', 'images', `art-${imgIndex}.${imgExt}`)
    
    if (fs.existsSync(imgPath)) {
      const mediaId = await client.v1.uploadMedia(imgPath)
      return client.v2.tweet({
        text,
        media: { media_ids: [mediaId] }
      })
    }
  } catch (err) {
    console.error('[Twitter Media Upload] Failed, falling back to text-only:', err)
  }
  // Fallback to text-only
  return client.v2.tweet(text)
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = getTwitterClient()
  if (!client) {
    return NextResponse.json(
      { error: 'Missing Twitter OAuth credentials (TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET)' },
      { status: 500 }
    )
  }

  // Pick a tweet based on current time + randomized pool
  const text = getRandomTweet()

  try {
    const result = await postTweet(client, text)
    if (result.data?.id) {
      return NextResponse.json({
        success: true,
        tweetId: result.data.id,
        text: result.data.text,
      })
    }
    return NextResponse.json({ success: false, error: 'No tweet ID returned' }, { status: 500 })
  } catch (e: any) {
    console.error('[Twitter Broadcast] ❌ Failed:', e.message || e)
    return NextResponse.json({ success: false, error: String(e.message || e) }, { status: 500 })
  }
}

// Manual POST for testing
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = getTwitterClient()
  if (!client) {
    return NextResponse.json({ error: 'Missing Twitter OAuth config' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const text = body.text || getRandomTweet()

  try {
    const result = await postTweet(client, text)
    return NextResponse.json({
      success: !!(result.data?.id),
      tweetId: result.data?.id,
      text: result.data?.text,
    })
  } catch (e: any) {
    console.error('[Twitter Broadcast] ❌ Failed:', e.message || e)
    return NextResponse.json({ success: false, error: String(e.message || e) }, { status: 500 })
  }
}
