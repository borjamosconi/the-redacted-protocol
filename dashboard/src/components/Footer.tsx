import Link from 'next/link'

export function Footer() {
  return (
    <footer className="relative bg-black border-t border-white/5 pt-24 pb-12 overflow-hidden">
      {/* Decorative background technical text */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] text-[10px] font-mono leading-none overflow-hidden select-none px-4">
         {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="whitespace-nowrap mb-2">
               {Array.from({ length: 15 }).map((_, j) => (
                  <span key={j} className="mr-8">REDACTED_PROTOCOL_V2_RELAY_NODE_{i}_{j} // AUTH_KEY_SECURE //</span>
               ))}
            </div>
         ))}
      </div>

      <div className="max-w-[1700px] mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          
          {/* Brand Col */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 border border-red-600 flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-600 rotate-45" />
               </div>
               <span className="text-2xl font-black text-white tracking-tighter uppercase">REDACTED_PROT.</span>
            </div>
            <p className="text-[11px] font-mono text-white/30 leading-relaxed uppercase tracking-widest max-w-sm">
               Declassifying the truth, one block at a time. The autonomous intelligence layer for restricted documents on Solana.
            </p>
            <div className="flex items-center gap-4">
               <div className="w-2 h-2 bg-red-600 animate-pulse shadow-[0_0_8px_#ff1a1a]" />
               <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">SYSTEM_SECURE_V2</span>
            </div>
          </div>

          {/* Module Registry */}
          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.5em] mb-8 border-b border-white/5 pb-4">MODULE_REGISTRY</h4>
            <div className="flex flex-col gap-4">
              {[
                { label: 'EXEC_TERMINAL', href: '/terminal/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj' },
                { label: 'LAUNCH_TOKEN', href: '/dashboard' },
                { label: 'AIRDROP_REWARDS', href: '/missions' },
                { label: 'DOC_ARCHIVE', href: '/terminal' },
              ].map(link => (
                <Link key={link.label} href={link.href} className="text-[10px] text-white/40 hover:text-red-500 hover:translate-x-1 transition-all uppercase tracking-widest font-black inline-block">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* External Relays */}
          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.5em] mb-8 border-b border-white/5 pb-4">EXTERNAL_RELAYS</h4>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'TELEGRAM_BOT', href: 'https://t.me/theredactedprotocol_bot' },
                { label: 'TWITTER_RECON', href: 'https://x.com/theprotocol_sol' },
                { label: 'SOLSCAN_RECORDS', href: 'https://solscan.io' },
                { label: 'DOCS_MODULE', href: '#' },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/30 hover:text-white transition-colors uppercase tracking-widest font-mono">
                  &gt;&gt; {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Airdrop Promo */}
          <div className="p-8 border border-white/5 bg-white/[0.01] relative group overflow-hidden">
            <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
            <div className="relative z-10">
              <span className="text-[9px] font-black text-red-600 group-hover:text-white uppercase tracking-[0.4em] mb-4 block">AIRDROP_PROTOCOL</span>
              <p className="text-[10px] text-white/30 group-hover:text-white/70 leading-relaxed uppercase mb-8">
                Establish your decryption rank to qualify for the genesis $RDX distribution.
              </p>
              <Link href="/dashboard" className="inline-block px-8 py-4 bg-white text-black text-[9px] font-black tracking-widest uppercase hover:bg-black hover:text-white transition-all shadow-[6px_6px_0px_rgba(255,0,0,0.2)]">
                JOIN_OPERATIONS
              </Link>
            </div>
          </div>
        </div>

        {/* Support Vault */}
        <div className="mb-20 p-8 border border-white/5 bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-10">
           <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">AGENT_MAINTENANCE_VAULT</span>
              <span className="text-[8px] font-mono text-white/10 uppercase tracking-[0.5em]">Funding autonomous infrastructure</span>
           </div>
           <div className="flex flex-col items-center md:items-end">
              <p className="text-[11px] font-mono text-red-600 font-black tracking-wider break-all bg-white/5 px-6 py-3 border border-white/10 select-all">
                CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8
              </p>
              <span className="text-[7px] text-white/10 mt-3 tracking-[0.8em] uppercase font-mono">SOL_SPL_SECURE</span>
           </div>
        </div>

        {/* Technical Footer Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8">
          <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest">
            © 2026 THE_REDACTED_PROTOCOL // FILE_BREATHING // NO_REDACTION
          </span>
          <div className="flex items-center gap-10">
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600/20 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-red-600/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-red-600/60 animate-pulse" style={{ animationDelay: '0.4s' }} />
             </div>
             <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.5em]">v2.0.8_PROD</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
