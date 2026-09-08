import { Link } from "react-router";
import { Phone, MessageCircle, ArrowUpRight, MapPin } from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Our Work", href: "/portfolio" },
  { label: "Our Clients", href: "/clients" },
  { label: "Pricing & Plans", href: "/pricing" },
  { label: "FAQ Documentation", href: "/faq" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export function Footer() {
  return (
    <footer data-footer className="relative bg-[#07192F] text-white border-t border-white/10 overflow-hidden">
      {/* Ambient background glow accents */}
      <div className="absolute -top-24 right-1/4 size-96 bg-[#2B7BC4]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-10 size-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* 1. Brand Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#0EA5E9] shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <span className="font-mono text-lg font-black text-white">C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  Creo
                </span>
                <span className="text-[9px] font-bold tracking-wider text-sky-400 uppercase">
                  Digital Agency Platform
                </span>
              </div>
            </Link>

            <p className="text-sm leading-relaxed text-slate-300/85 max-w-sm">
              Your creative growth engine. High-converting reels, studio carousels, and content operations delivered on autopilot.
            </p>


          </div>

          {/* 2. Quick Links Column (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Quick Links
            </h3>
            <ul className="flex flex-col space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="group inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      {link.label}
                    </span>
                    <ArrowUpRight className="size-3 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-cyan-400 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Direct Contact Column (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Direct Contact
            </h3>
            <ul className="flex flex-col space-y-3">
              <li>
                <a
                  href="https://wa.me/919941999415"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 text-sm text-slate-200 hover:text-emerald-400 transition-colors"
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
                  className="group inline-flex items-center gap-2.5 text-sm text-slate-200 hover:text-sky-300 transition-colors"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:bg-sky-500/20 group-hover:scale-105 transition-all">
                    <Phone className="size-3.5" />
                  </div>
                  <span className="font-medium">+91 9941999415</span>
                </a>
              </li>
            </ul>
            <div className="pt-1 text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">Support Hours:</span>
              <br />
              Mon – Sat · 9:30 AM – 7:00 PM IST
            </div>
          </div>

          {/* 4. Follow Us & Location (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Follow Us
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <a
                href="https://www.instagram.com/creotool26?igsh=NjN0eWxwZ2VqbWJ3"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 hover:text-white hover:border-transparent hover:scale-105 transition-all duration-200 shadow-xs cursor-pointer"
                aria-label="Instagram"
                title="Instagram"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/share/1GKDeenkvC/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-[#1877F2] hover:text-white hover:border-transparent hover:scale-105 transition-all duration-200 shadow-xs cursor-pointer"
                aria-label="Facebook"
                title="Facebook"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/creo-tool-3bb3b841b?utm_source=share_via&utm_content=profile&utm_medium=member_android"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-[#0A66C2] hover:text-white hover:border-transparent hover:scale-105 transition-all duration-200 shadow-xs cursor-pointer"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://x.com/creotool"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-black hover:text-white hover:border-slate-700 hover:scale-105 transition-all duration-200 shadow-xs cursor-pointer"
                aria-label="Twitter / X"
                title="X (Twitter)"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            <div className="pt-2 text-xs text-slate-400 flex items-start gap-1.5">
              <MapPin className="size-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span>Chennai & Bengaluru, India</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Perfectly balanced and aligned */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} Creo Marketing Technologies Inc. All rights reserved.
          </p>
          <ul className="flex items-center gap-6">
            {LEGAL_LINKS.map((link, index) => (
              <li key={index}>
                <Link
                  to={link.href}
                  className="hover:text-white transition-colors"
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
