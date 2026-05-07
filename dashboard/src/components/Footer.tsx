export function Footer() {
  return (
    <footer className="border-t border-rd-border/50 py-16 relative overflow-hidden">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-rd-red/20 to-transparent" />

      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
          {/* Logo + Tagline */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Redacted Protocol" className="w-7 h-7 drop-shadow-[0_0_6px_rgba(255,26,26,0.4)]" />
              <span className="text-[10px] tracking-[0.4em] text-rd-muted">
                REDACTED PROTOCOL
              </span>
            </div>
            <p className="text-[10px] text-rd-muted/30 tracking-[0.3em]">
              THE FILE IS BREATHING
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { href: 'https://github.com/whalesconspiracy-33/the-redacted-protocol', label: 'GITHUB', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> },
              { href: 'https://t.me/TheRedacted_sol', label: 'GROUP', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
              { href: 'https://t.me/theredactedprotocol_bot', label: 'BOT', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
              { href: 'https://x.com/theprotocol_sol', label: 'X / TWITTER', icon: <span className="text-xs font-bold">&#x1D54F;</span> },
              { href: 'https://solscan.io', label: 'SOLSCAN', icon: null },
              { href: 'https://redacted.bond', label: 'REDACTED.BOND', icon: null },
            ].map((link, i) => (
              <a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 text-[10px] text-rd-muted/40 hover:text-rd-red/70 transition-all duration-300 tracking-[0.2em] group"
              >
                {link.icon && <span className="group-hover:drop-shadow-[0_0_4px_#ff1a1a]">{link.icon}</span>}
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Vault — Agent Donation */}
        <div className="mb-10 p-4 border border-red-900/20 bg-red-950/5 rounded-sm text-center">
          <p className="text-[9px] font-mono text-red-500/50 tracking-[0.3em] uppercase mb-2">Support The Agent — Vault Address</p>
          <p className="text-[10px] font-mono text-gray-600 tracking-wider break-all select-all hover:text-gray-400 transition-colors cursor-text">
            CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8
          </p>
          <p className="text-[9px] text-gray-700 mt-1 tracking-widest">SOL / SPL TOKENS ACCEPTED</p>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-rd-border/30 text-center">
          <p className="text-[10px] text-rd-muted/15 tracking-[0.4em]">
            ██████ CANNOT BE REDACTED ██████ — MIT LICENSE — 2026 — REDACTED PROTOCOL
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="w-1 h-1 rounded-full bg-rd-red/20 animate-pulse" />
            <div className="w-1 h-1 rounded-full bg-rd-red/30 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 h-1 rounded-full bg-rd-red/40 animate-pulse" style={{ animationDelay: '0.4s' }} />
            <div className="w-1 h-1 rounded-full bg-rd-red/50 animate-pulse" style={{ animationDelay: '0.6s' }} />
            <div className="w-1 h-1 rounded-full bg-rd-red/40 animate-pulse" style={{ animationDelay: '0.8s' }} />
            <div className="w-1 h-1 rounded-full bg-rd-red/30 animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="w-1 h-1 rounded-full bg-rd-red/20 animate-pulse" style={{ animationDelay: '1.2s' }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
