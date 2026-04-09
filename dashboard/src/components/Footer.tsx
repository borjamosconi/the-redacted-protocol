export function Footer() {
  return (
    <footer className="border-t border-rd-border py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="Redacted Protocol" className="w-6 h-6" />
            <span className="text-xs tracking-[0.3em] text-rd-muted">
              REDACTED PROTOCOL
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="https://github.com/whalesconspiracy-33/the-redacted-protocol" target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-rd-muted/40 hover:text-rd-red/70 transition-colors tracking-widest">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GITHUB
            </a>
            <a href="https://t.me/theredacted_bot" target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-rd-muted/40 hover:text-rd-red/70 transition-colors tracking-widest">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              TELEGRAM
            </a>
            <a href="https://x.com/theprotocol_sol" target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-rd-muted/40 hover:text-rd-red/70 transition-colors tracking-widest">
              <span className="text-xs font-bold">&#x1D54F;</span>
              X / TWITTER
            </a>
            <a href="https://solscan.io" target="_blank" rel="noopener" className="text-xs text-rd-muted/40 hover:text-rd-red/70 transition-colors tracking-widest">
              SOLSCAN
            </a>
          </div>

          {/* Tagline */}
          <div className="text-xs text-rd-muted/30 tracking-widest">
            THE FILE IS BREATHING
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-rd-border text-center">
          <p className="text-[10px] text-rd-muted/20 tracking-[0.3em]">
            ███ CANNOT BE REDACTED ███ — MIT LICENSE — 2026
          </p>
        </div>
      </div>
    </footer>
  )
}
