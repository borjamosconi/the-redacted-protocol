import { NextResponse } from 'next/server'
import { getHourlyUpdate, sendTelegramBroadcast } from '@/lib/telegram-scheduler'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Security check: Verify Cron Secret
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get('authorization')
  const secret = searchParams.get('secret') || authHeader?.split(' ')[1]

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const update = await getHourlyUpdate()
    await sendTelegramBroadcast(update.text)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Hourly broadcast dispatched',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Telegram Cron Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
