'use client'

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { SolanaProvider } from './SolanaProvider'

const WalletReadyContext = createContext(false)
export const useWalletReady = () => useContext(WalletReadyContext)

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <WalletReadyContext.Provider value={mounted}>
      <SolanaProvider>
        {mounted ? (
          children
        ) : (
          <div className="bg-black min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-5 h-5 border border-red-900/30 border-t-red-500 rounded-full animate-spin" />
              <span className="text-gray-600 text-xs font-mono tracking-widest uppercase">Initializing Protocol...</span>
            </div>
          </div>
        )}
      </SolanaProvider>
    </WalletReadyContext.Provider>
  )
}
