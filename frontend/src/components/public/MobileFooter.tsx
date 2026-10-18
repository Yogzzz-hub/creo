import { Link } from "react-router";

export function MobileFooter() {
  return (
    <footer className="w-full bg-[#050810] border-t border-[#2A3446] pt-8 pb-8 px-5 font-plus-jakarta text-[#F8FAFC]">
      {/* 1. Top Identity & Studio Header */}
      <div className="flex items-center justify-between">
        {/* Left: Brand Wordmark */}
        <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center">
          CREO<span className="text-[#7FA0D6]">.</span>
        </Link>

        {/* Right: Telemetry Pill Chip */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B111C] border border-[#2A3446]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7FA0D6] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7FA0D6]" />
          </span>
          <span className="text-[11px] font-medium text-[#BCCCE6] tracking-tight">Studio Engine Live</span>
        </div>
      </div>

      {/* Studio Description */}
      <p className="text-xs text-[#97A0B3] leading-relaxed mt-3 mb-3.5">
        Your creative growth engine. High-converting reels, studio carousels, and content operations delivered on autopilot.
      </p>

      {/* Location Tag */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B111C] border border-[#2A3446] text-xs text-white">
        <svg className="w-3.5 h-3.5 text-[#7FA0D6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Bangalore, India</span>
      </div>

      {/* 2. Quick Links (Compact 2x2 Clean Micro-Grid) */}
      <div className="mt-6">
        <div className="text-[10px] tracking-widest text-[#97A0B3] uppercase font-semibold">QUICK LINKS</div>
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <Link
            to="/"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 transition-colors"
          >
            <span className="text-xs font-medium text-white">Home</span>
            <svg className="w-3 h-3 text-[#97A0B3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </Link>

          <Link
            to="/about"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 transition-colors"
          >
            <span className="text-xs font-medium text-white">About Us</span>
            <svg className="w-3 h-3 text-[#97A0B3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </Link>

          <Link
            to="/pricing"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 transition-colors"
          >
            <span className="text-xs font-medium text-white">Pricing & Plans</span>
            <svg className="w-3 h-3 text-[#97A0B3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </Link>

          <Link
            to="/work"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 transition-colors"
          >
            <span className="text-xs font-medium text-white">Work & Case Studies</span>
            <svg className="w-3 h-3 text-[#97A0B3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 3. Direct Contact Capsule */}
      <div className="mt-6">
        <div className="text-[10px] tracking-widest text-[#97A0B3] uppercase font-semibold">DIRECT CONTACT</div>
        <div className="rounded-xl bg-[#0B111C] border border-[#2A3446] p-1.5 flex items-center gap-2 mt-2">
          {/* Left: WhatsApp Button (~55% width) */}
          <a
            href="https://wa.me/919941999415"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-[1.2] flex items-center justify-center gap-1.5 bg-[#BCCCE6] text-[#050810] py-2.5 px-2 rounded-lg font-semibold text-xs active:opacity-90 hover:bg-white transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span className="tracking-tight truncate font-semibold">WhatsApp Us (Priority 24/7)</span>
          </a>

          {/* Right: Phone Tile (~45% width) */}
          <a
            href="tel:+919941999415"
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#161F2D] border border-[#2A3446] text-white py-2.5 px-2 rounded-lg font-medium text-xs hover:border-[#7FA0D6]/60 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-[#BCCCE6] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="tracking-tight text-white font-medium whitespace-nowrap">+91 99419 99415</span>
          </a>
        </div>

        {/* Support Hours */}
        <span className="text-[10px] text-[#97A0B3] mt-2 block tracking-tight">
          Support Hours: Mon – Sat • 9:30 AM – 7:00 PM IST
        </span>
      </div>

      {/* 4. Follow Us (Social Glyphs) */}
      <div className="mt-6">
        <div className="text-[10px] tracking-widest text-[#97A0B3] uppercase font-semibold">FOLLOW US</div>
        <div className="flex items-center gap-2.5 mt-2">
          {/* Instagram */}
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-11 h-11 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center text-[#BCCCE6] hover:text-white hover:border-[#7FA0D6] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>

          {/* LinkedIn */}
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="w-11 h-11 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center text-[#BCCCE6] hover:text-white hover:border-[#7FA0D6] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect width="4" height="12" x="2" y="9" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </a>

          {/* Threads */}
          <a
            href="https://threads.net"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Threads"
            className="w-11 h-11 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center text-[#BCCCE6] hover:text-white hover:border-[#7FA0D6] transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.186 24C5.466 24 0 18.672 0 12.103 0 5.533 5.466.206 12.186.206c6.643 0 11.966 5.176 11.966 11.75 0 .546-.039 1.09-.117 1.63-.38 2.68-1.848 5.064-4.135 6.716-2.128 1.536-4.78 2.37-7.469 2.37-3.953 0-7.398-2.029-8.995-5.297l2.257-1.309c1.238 2.531 3.905 4.106 6.738 4.106 2.08 0 4.138-.646 5.795-1.82 1.765-1.25 2.898-3.076 3.19-5.143H12.186v-2.5h10.985c.01-.157.016-.316.016-.475 0-5.184-4.215-9.25-9.466-9.25-5.252 0-9.467 4.066-9.467 9.25 0 5.185 4.215 9.251 9.467 9.251 2.227 0 4.39-.77 6.09-2.167l1.642 1.89C19.262 22.955 15.82 24 12.186 24z" />
            </svg>
          </a>

          {/* X */}
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="w-11 h-11 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center text-[#BCCCE6] hover:text-white hover:border-[#7FA0D6] transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>

      {/* 5. Copyright & Legal Baseline (Grounded Termination) */}
      <div className="border-t border-[#2A3446] mt-6 pt-4 flex items-center justify-between text-[11px] text-[#97A0B3]">
        {/* Left: Copyright */}
        <div>© 2026 CREO Tech Inc.</div>

        {/* Right: Legal Links */}
        <div className="flex items-center gap-1.5">
          <Link to="/privacy" className="hover:text-[#BCCCE6] transition-colors">Privacy</Link>
          <span className="text-[#2A3446]">•</span>
          <Link to="/terms" className="hover:text-[#BCCCE6] transition-colors">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
