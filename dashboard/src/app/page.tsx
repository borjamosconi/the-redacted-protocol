'use client'
import { useState, useEffect } from 'react'

import { useWallet } from '@solana/wallet-adapter-react'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { ColosseumSection } from '@/components/ColosseumSection'
import { AirdropSection } from '@/components/AirdropSection'
import { PresalePanel } from '@/components/PresalePanel'
import { GamificationPanel } from '@/components/GamificationPanel'
import { OcrSection } from '@/components/OcrSection'
import { ImageGenSection } from '@/components/ImageGenSection'
import { CinemaStudioSection } from '@/components/CinemaStudioSection'
import { GallerySection } from '@/components/GallerySection'
import { NewsSection } from '@/components/NewsSection'
import { FragmentsSection } from '@/components/FragmentsSection'
import { TokenomicsSection } from '@/components/TokenomicsSection'
import { Footer } from '@/components/Footer'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="bg-black min-h-screen" />
  }

  return <HomeContent />
}

function HomeContent() {
  const { publicKey } = useWallet()

  return (
    <>
      <Header />
      <main>
        <Hero />
        <ColosseumSection />
        <AirdropSection />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <PresalePanel />
        </div>
        <GamificationPanel walletAddress={publicKey?.toString()} />
        <OcrSection />
        <ImageGenSection />
        <CinemaStudioSection />
        <GallerySection />
        <NewsSection />
        <FragmentsSection />
        <TokenomicsSection />
      </main>
      <Footer />
    </>
  )
}
