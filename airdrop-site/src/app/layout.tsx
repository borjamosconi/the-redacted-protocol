import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '$RDX Airdrop — Redacted Protocol',
  description: 'Register your wallet for the Redacted Protocol $RDX airdrop. 1,000 RDX guaranteed for every early user.',
  keywords: ['RDX', 'Redacted Protocol', 'Solana', 'Airdrop', 'Crypto'],
  openGraph: {
    title: '$RDX Airdrop — Redacted Protocol',
    description: 'Register for 1,000 RDX tokens. The file is breathing.',
    type: 'website',
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
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>███</text></svg>" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
