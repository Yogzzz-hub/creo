import { Link } from "react-router";
import { Phone, MessageCircle, MapPin, ArrowRight, ArrowUpRight } from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Pricing & Plans", href: "/pricing" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export function Footer() {
  return (
    <footer data-footer className="w-full bg-[#050810] text-[#F8FAFC] border-t border-[#222F44] py-10 sm:py-12 selection:bg-[#7FA0D6]/30">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        
        {/* 1. Pre-Footer Conversion Bento Banner */}
        <div className="bg-[#121926] border border-[#222F44] rounded-3xl p-6 sm:p-10 text-center mb-10 sm:mb-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-4xl font-black text-[#F8FAFC] tracking-tight">
              Stop managing the chaos. Start operating the momentum.
            </h2>
            <p className="text-xs sm:text-sm text-[#97A0B3] mt-3 mb-8 max-w-xl mx-auto font-medium leading-relaxed">
              Join 50+ modern creative agencies running content production, client sign-offs, and unit economics on CREO OS.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/pricing" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#BCCCE6] text-[#050810] hover:bg-white font-bold transition-all shadow-sm px-7 py-3.5 rounded-full text-xs sm:text-sm"
              >
                <span>Deploy CREO in Your Agency</span>
                <ArrowRight className="size-4" />
              </Link>
              <a 
                href="https://wa.me/919941999415" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0A0F18] border border-[#222F44] text-[#F8FAFC] hover:bg-[#0B111C] transition-colors px-6 py-3.5 rounded-full text-xs sm:text-sm font-semibold"
              >
                <MessageCircle className="size-4 text-emerald-400" />
                <span>Schedule Live Demo</span>
              </a>
            </div>
          </div>
        </div>

        {/* 2. Main 4-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-12 border-b border-[#222F44]">
          {/* Column 1: Brand Info (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-[#F8FAFC] flex items-baseline">
              <span>creo</span>
              <span className="text-[#7FA0D6] text-3xl leading-none">.</span>
            </Link>
            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed max-w-sm">
              Your creative growth engine. High-converting reels, studio carousels, and content operations delivered on autopilot.
            </p>
            <div className="pt-2 text-xs text-[#97A0B3] flex items-center gap-2">
              <MapPin className="size-3.5 text-[#7FA0D6] shrink-0" />
              <span>Bangalore, India</span>
            </div>
          </div>

          {/* Column 2: Quick Links (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#7FA0D6]">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="group inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#97A0B3] hover:text-[#F8FAFC] transition-colors"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      {link.label}
                    </span>
                    <ArrowUpRight className="size-3 text-[#97A0B3] opacity-0 group-hover:opacity-100 group-hover:text-[#7FA0D6] transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Direct Contact (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#7FA0D6]">
              Direct Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/919941999415"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 text-xs sm:text-sm text-[#F8FAFC] hover:text-emerald-400 transition-colors"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all">
                    <MessageCircle className="size-3.5" />
                  </div>
                  <span className="font-medium">WhatsApp Us</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+919941999415"
                  className="group inline-flex items-center gap-2.5 text-xs sm:text-sm text-[#F8FAFC] hover:text-[#7FA0D6] transition-colors"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#7FA0D6]/10 text-[#7FA0D6] border border-[#7FA0D6]/20 group-hover:bg-[#7FA0D6]/20 group-hover:scale-105 transition-all">
                    <Phone className="size-3.5" />
                  </div>
                  <span className="font-medium">+91 9941999415</span>
                </a>
              </li>
            </ul>
            <div className="pt-1 text-[11px] text-[#97A0B3] leading-relaxed">
              <span className="font-semibold text-[#F8FAFC]">Support Hours:</span>
              <br />
              Mon – Sat · 9:30 AM – 7:00 PM IST
            </div>
          </div>

          {/* Column 4: Follow Us (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#7FA0D6]">
              Follow Us
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/creotool26?igsh=NjN0eWxwZ2VqbWJ3"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-11 sm:size-9 items-center justify-center rounded-xl border border-[#222F44] bg-[#0A0F18] text-[#97A0B3] hover:text-white hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 hover:border-transparent transition-all shadow-xs"
                aria-label="Instagram"
                title="Instagram"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/creo-tool-3bb3b841b?utm_source=share_via&utm_content=profile&utm_medium=member_android"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-11 sm:size-9 items-center justify-center rounded-xl border border-[#222F44] bg-[#0A0F18] text-[#97A0B3] hover:text-white hover:bg-[#7FA0D6] hover:border-transparent transition-all shadow-xs"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/share/1GKDeenkvC/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-11 sm:size-9 items-center justify-center rounded-xl border border-[#222F44] bg-[#0A0F18] text-[#97A0B3] hover:text-white hover:bg-[#7FA0D6] hover:border-transparent transition-all shadow-xs"
                aria-label="Facebook"
                title="Facebook"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* X / Twitter */}
              <a
                href="https://x.com/creotool"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-11 sm:size-9 items-center justify-center rounded-xl border border-[#222F44] bg-[#0A0F18] text-[#97A0B3] hover:text-white hover:bg-black hover:border-slate-700 transition-all shadow-xs"
                aria-label="Twitter / X"
                title="X (Twitter)"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* 3. Bottom Legal Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#97A0B3]">
          <p>
            &copy; {new Date().getFullYear()} CREO Technologies Inc. All rights reserved.
          </p>
          <ul className="flex items-center gap-6">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="hover:text-[#F8FAFC] transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </footer>
  );
}
