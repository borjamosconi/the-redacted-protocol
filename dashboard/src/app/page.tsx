'use client'

import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { AirdropSection } from '@/components/AirdropSection'
import { FragmentsSection } from '@/components/FragmentsSection'
import { TokenomicsSection } from '@/components/TokenomicsSection'
import { NewsSection } from '@/components/NewsSection'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <AirdropSection />
        <FragmentsSection />
        <NewsSection />
        <TokenomicsSection />
      </main>
      <Footer />
    </>
  )
}
