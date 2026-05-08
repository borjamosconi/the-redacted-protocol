import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TerminalEasterEgg } from '@/components/TerminalEasterEgg'

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
  title: 'REDACTED PROTOCOL // Declassify the Truth',
  description: 'The world\'s first autonomous inference engine dedicated to document declassification on Solana. $RDX Genesis Airdrop: ACTIVE.',
  keywords: ['RDX', 'Redacted Protocol', 'Solana', 'Airdrop', 'AI', 'Declassification', 'Truth', 'Epstein', 'JFK'],
  metadataBase: new URL('https://redacted.bond'),
  alternates: { canonical: 'https://redacted.bond' },
  openGraph: {
    title: 'REDACTED PROTOCOL // TRUTH DECRYPTED',
    description: 'The file is breathing. Join the global declassification event on Solana.',
    type: 'website',
    url: 'https://redacted.bond',
    images: [{
      url: '/logo.png',
      width: 1200,
      height: 630,
      alt: 'Redacted Protocol'
    }],
    siteName: 'Redacted Protocol',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'REDACTED PROTOCOL // TRUTH DECRYPTED',
    description: 'Autonomous AI declassification agent. $RDX Airdrop phase 1 live.',
    images: ['/logo.png'],
    creator: '@redacted_bond',
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
        <link rel="icon" href="/logo.png" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="antialiased font-grotesk">
        <ErrorBoundary>
          <Providers>
          <div className="grid-bg min-h-screen relative overflow-x-hidden">
            {/* Atmosphere Overlays */}
            <div className="scanline-premium" />
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-[1000]" />
            
            <Header />
            {children}
            <Footer />
            <TerminalEasterEgg />
          </div>
        </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
