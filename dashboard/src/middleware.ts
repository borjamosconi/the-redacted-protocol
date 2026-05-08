import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter (per Edge Runtime instance)
// In a production environment with many users, you would use Redis (Upstash)
const rateLimitMap = new Map<string, { count: number, lastReset: number }>()

const LIMIT = 50 // requests
const WINDOW = 60 * 1000 // 1 minute

export function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const now = Date.now()
  
  const record = rateLimitMap.get(ip) || { count: 0, lastReset: now }
  
  if (now - record.lastReset > WINDOW) {
    record.count = 1
    record.lastReset = now
  } else {
    record.count++
  }
  
  rateLimitMap.set(ip, record)

  // Block if limit exceeded
  if (record.count > LIMIT) {
    return new NextResponse(
      JSON.stringify({ error: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Protocol protection active.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Security Headers
  const response = NextResponse.next()
  
  // Prevent XSS and Clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: wss:;"
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
