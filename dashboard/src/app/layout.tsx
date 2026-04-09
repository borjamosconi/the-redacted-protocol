import type { Metadata } from 'next'
import './globals.css'
import { SolanaProvider } from '@/components/SolanaProvider'

export const metadata: Metadata = {
  title: 'Redacted Protocol — $RDX Airdrop',
  description: 'Autonomous zero-knowledge AI agent for document declassification on Solana. Register for 1,000 RDX airdrop.',
  keywords: ['RDX', 'Redacted Protocol', 'Solana', 'Airdrop', 'AI', 'Zero-Knowledge', 'OCR', 'Declassification'],
  openGraph: {
    title: 'Redacted Protocol — $RDX Airdrop',
    description: 'The file is breathing. Register for 1,000 RDX.',
    type: 'website',
    images: ['/logo.svg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%230a0a0a' width='100' height='100'/><text x='50' y='68' font-size='60' text-anchor='middle' fill='%23ff1a1a'>█</text></svg>" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="antialiased">
        <SolanaProvider>
          <div className="grid-bg min-h-screen relative">
            <div className="scanline" />
            <div className="vhs-overlay" />
            {children}
          </div>
        </SolanaProvider>
      </body>
    </html>
  )
}
