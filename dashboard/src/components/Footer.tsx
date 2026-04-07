export function Footer() {
  return (
    <footer className="border-t border-rd-border py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-rd-red/20 border border-rd-red/40 flex items-center justify-center">
              <span className="text-rd-red text-[10px] font-bold">RD</span>
            </div>
            <span className="text-xs tracking-[0.3em] text-rd-muted">
              REDACTED PROTOCOL
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="https://github.com/AKIRA-33/the_redacted_protocol" target="_blank" rel="noopener" className="text-xs text-rd-muted/40 hover:text-rd-red/70 transition-colors tracking-widest">
              GITHUB
            </a>
            <a href="https://t.me/theredacted_bot" target="_blank" rel="noopener" className="text-xs text-rd-muted/40 hover:text-rd-red/70 transition-colors tracking-widest">
              TELEGRAM
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
