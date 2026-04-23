import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'Redacted Protocol — $RDX Airdrop',
  description: 'Autonomous zero-knowledge AI agent for document declassification on Solana. Register for 700 RDX airdrop.',
  keywords: ['RDX', 'Redacted Protocol', 'Solana', 'Airdrop', 'AI', 'Zero-Knowledge', 'OCR', 'Declassification'],
  metadataBase: new URL('https://redacted.bond'),
  alternates: { canonical: 'https://redacted.bond' },
  openGraph: {
    title: 'Redacted Protocol — $RDX Airdrop',
    description: 'The file is breathing. Register for 700 RDX.',
    type: 'website',
    url: 'https://redacted.bond',
    images: ['/logo.svg'],
    siteName: 'Redacted Protocol',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Redacted Protocol — $RDX Airdrop',
    description: 'The file is breathing. Register for 700 RDX.',
    creator: '@theredacted_bot',
  },
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="icon" href="/logo.svg" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="antialiased font-grotesk">
        <ErrorBoundary>
          <Providers>
            <div className="grid-bg min-h-screen relative">
              <div className="scanline" />
              <div className="vhs-overlay" />
              {children}
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
