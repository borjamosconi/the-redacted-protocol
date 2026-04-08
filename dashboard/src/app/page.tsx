'use client'

import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { AirdropSection } from '@/components/AirdropSection'
import { OcrSection } from '@/components/OcrSection'
import { NewsSection } from '@/components/NewsSection'
import { FragmentsSection } from '@/components/FragmentsSection'
import { TokenomicsSection } from '@/components/TokenomicsSection'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <AirdropSection />
        <OcrSection />
        <NewsSection />
        <FragmentsSection />
        <TokenomicsSection />
      </main>
      <Footer />
    </>
  )
}
