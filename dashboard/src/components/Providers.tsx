'use client'

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { SolanaProvider } from './SolanaProvider'

const WalletReadyContext = createContext(false)
export const useWalletReady = () => useContext(WalletReadyContext)

function BootSpinner() {
  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-5 h-5 border border-red-900/30 border-t-red-500 rounded-full animate-spin" />
        <span className="text-gray-600 text-xs font-mono tracking-widest uppercase">Initializing Protocol...</span>
      </div>
    </div>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // SolanaProvider MUST only render client-side to avoid React 19 hydration
  // mismatch — wallet adapters read localStorage which doesn't exist on SSR.
  if (!mounted) {
    return (
      <WalletReadyContext.Provider value={false}>
        <BootSpinner />
      </WalletReadyContext.Provider>
    )
  }

  return (
    <WalletReadyContext.Provider value={true}>
      <SolanaProvider>
        {children}
      </SolanaProvider>
    </WalletReadyContext.Provider>
  )
}
