'use client'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { TokenLiveBanner } from '@/components/TokenLiveBanner'
import { BuyIncentivesPanel } from '@/components/BuyIncentivesPanel'
import { GamificationPanel } from '@/components/GamificationPanel'
import { OcrSection } from '@/components/OcrSection'
import { ScrollVideoSection } from '@/components/ScrollVideoSection'
import { ColosseumSection } from '@/components/ColosseumSection'
import { ImageGenSection } from '@/components/ImageGenSection'
import { GallerySection } from '@/components/GallerySection'
import { FragmentsSection } from '@/components/FragmentsSection'
import { CinemaStudioSection } from '@/components/CinemaStudioSection'
import { TruthReconstructor } from '@/components/TruthReconstructor'
import { NewsSection } from '@/components/NewsSection'
import { LeaksFeed } from '@/components/LeaksFeed'
import { TokenomicsSection } from '@/components/TokenomicsSection'
import { Footer } from '@/components/Footer'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="bg-black min-h-screen" />
  return <HomeContent />
}

function HomeContent() {
  const { publicKey } = useWallet()
  return (
    <>
      <main>
        <Hero />
        <LeaksFeed />
        <HowItWorks />
        <TokenLiveBanner />
        <BuyIncentivesPanel />
        <ScrollVideoSection />
        <ColosseumSection />
        <GamificationPanel walletAddress={publicKey?.toString()} />
        <OcrSection />
        <ImageGenSection />
        <GallerySection />
        <TruthReconstructor />
        <NewsSection />
        <FragmentsSection />
        <CinemaStudioSection />
        <TokenomicsSection />
      </main>
    </>
  )
}
