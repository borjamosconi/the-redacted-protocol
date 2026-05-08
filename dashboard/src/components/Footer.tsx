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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
          
            </div>
            <p className="text-[10px] text-white/30 tracking-[0.2em] leading-relaxed uppercase">
              The first autonomous news reconstruction protocol on Solana. 
              Deciphering the truth, one block at a time.
            </p>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-red-600 animate-pulse" />
               <span className="text-[9px] font-mono text-red-600 font-black tracking-widest uppercase">SECURE_RELAY_ACTIVE</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="lg:col-span-1">
             <h4 className="text-[10px] font-black text-white uppercase tracking-[0.5em] mb-8 border-b border-white/5 pb-4">MODULE_REGISTRY</h4>
             <div className="flex flex-col gap-4">
                {[
                  { label: 'EXEC_TERMINAL', href: '/terminal/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj' },
                  { label: 'LAUNCH_TOKEN', href: '/dashboard' },
                  { label: 'AIRDROP_REWARDS', href: '/#gamification' },
                  { label: 'GET_ARCHIVE', href: '/#news' },
                ].map(link => (
                  <a key={link.label} href={link.href} className="text-[10px] text-white/40 hover:text-red-500 hover:translate-x-1 transition-all uppercase tracking-widest font-black">
                     {link.label}
                  </a>
                ))}
             </div>
          </div>

          {/* Social Links */}
          <div className="lg:col-span-1">
             <h4 className="text-[10px] font-black text-white uppercase tracking-[0.5em] mb-8 border-b border-white/5 pb-4">EXTERNAL_RELAYS</h4>
             <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'TG_PORTAL', href: 'https://t.me/theredactedprotocol_bot', icon: '📡' },
                  { label: 'X_RECON', href: 'https://x.com/theprotocol_sol', icon: '✖' },
                  { label: 'GIT_SOURCE', href: 'https://github.com/whalesconspiracy-33/the-redacted-protocol', icon: '📁' },
                  { label: 'SOLSCAN', href: 'https://solscan.io', icon: '🔍' },
                ].map(link => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[9px] text-white/40 hover:text-white transition-colors uppercase tracking-widest">
                     <span className="text-sm opacity-60">{link.icon}</span>
                     {link.label}
                  </a>
                ))}
             </div>
          </div>

          {/* Airdrop Call to Action */}
          <div className="lg:col-span-1">
             <div className="p-6 border border-red-600/30 bg-red-600/5 relative group overflow-hidden">
                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className="relative z-10">
                   <span className="text-[9px] font-black text-red-500 group-hover:text-white uppercase tracking-[0.4em] mb-2 block">AIRDROP_REGISTRY</span>
                   <p className="text-[10px] text-white/40 group-hover:text-white/80 leading-relaxed uppercase mb-6">
                      Participate in document launches to qualify for the initial $RDX distribution.
                   </p>
                   <a href="/dashboard" className="inline-block px-6 py-3 bg-white text-black text-[9px] font-black tracking-widest uppercase hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_rgba(255,0,0,0.2)]">
                      JOIN_OPERATIONS
                   </a>
                </div>
             </div>
          </div>
        </div>

        {/* Support the Agent - Vault Address */}
        <div className="mb-20 p-8 border border-white/5 bg-white/[0.01] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-[7px] font-mono text-white/10 uppercase tracking-[0.5em] group-hover:text-red-500/40 transition-colors">AGENT_REPAIR_VAULT</div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Support the Autonomous Agent</span>
                <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">Maintenance & Infrastructure Funding</span>
             </div>
             <div className="flex flex-col items-center md:items-end">
                <p className="text-[11px] font-mono text-red-500 font-black tracking-wider break-all select-all hover:text-white transition-colors cursor-text text-center md:text-right bg-white/5 px-4 py-2 border border-white/10">
                  CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8
                </p>
                <span className="text-[8px] text-white/10 mt-2 tracking-[0.5em] uppercase">SOL / SPL ASSETS ACCEPTED</span>
             </div>
          </div>
        </div>

        {/* Final Status Line */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
             <p className="text-[9px] text-white/10 tracking-[0.5em] uppercase font-mono">
               THE FILE IS BREATHING // NO REDACTION POSSIBLE
             </p>
          </div>
          <div className="flex items-center gap-8">
             <span className="text-[9px] text-white/20 font-mono tracking-widest">© 2026 REDACTED_PROTOCOL</span>
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600/20 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-red-600/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-red-600/60 animate-pulse" style={{ animationDelay: '0.4s' }} />
             </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
