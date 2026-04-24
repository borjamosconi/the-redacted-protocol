'use client'

import { useMemo, useState, useEffect } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import '@solana/wallet-adapter-react-ui/styles.css'

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const [rpcUrl] = useState(
    process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'
  )

  const [wallets, setWallets] = useState<any[]>([])

  useEffect(() => {
    setWallets([new PhantomWalletAdapter(), new SolflareWalletAdapter()])
  }, [])

  return (
    <ConnectionProvider endpoint={rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
