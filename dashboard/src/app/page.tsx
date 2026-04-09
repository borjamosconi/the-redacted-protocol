'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { ColosseumSection } from '@/components/ColosseumSection'
import { AirdropSection } from '@/components/AirdropSection'
import { GamificationPanel } from '@/components/GamificationPanel'
import { OcrSection } from '@/components/OcrSection'
import { ImageGenSection } from '@/components/ImageGenSection'
import { GallerySection } from '@/components/GallerySection'
import { NewsSection } from '@/components/NewsSection'
import { FragmentsSection } from '@/components/FragmentsSection'
import { TokenomicsSection } from '@/components/TokenomicsSection'
import { Footer } from '@/components/Footer'

export default function Home() {
  const { publicKey } = useWallet()

  return (
    <>
      <Header />
      <main>
        <Hero />
        <ColosseumSection />
        <AirdropSection />
        <GamificationPanel walletAddress={publicKey?.toString()} />
        <OcrSection />
        <ImageGenSection />
        <GallerySection />
        <NewsSection />
        <FragmentsSection />
        <TokenomicsSection />
      </main>
      <Footer />
    </>
  )
}
