export function Footer() {
  return (
    <footer className="border-t border-white/5 py-24 relative overflow-hidden bg-black">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-4 gap-16 mb-20">
          
          {/* Identity Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-red-600 flex items-center justify-center font-black text-white text-xl rotate-45">
                  <span className="-rotate-45">R</span>
               </div>
               <div className="flex flex-col leading-none">
                  <span className="text-xl font-black text-white tracking-tighter uppercase">THE_REDACTED</span>
                  <span className="text-[8px] font-mono text-red-500 tracking-[0.4em] mt-1 font-black">PROTOCOL_V2.0</span>
               </div>
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
