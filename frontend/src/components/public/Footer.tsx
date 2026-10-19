import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUp, ArrowUpRight, Check, Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { MaskReveal, RollText, ScrambleText, SplitText } from "../motion";
import { smoothScrollTo } from "../motion/SmoothScroll";

const WHATSAPP_URL = "https://wa.me/919941999415";

const LINK_GROUPS = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "Our work", href: "/work" },
      { label: "Clients", href: "/clients" },
      { label: "Pricing & plans", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms & conditions", href: "/terms" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Free sample batch", href: "/signup?intent=sample" },
      { label: "Create an account", href: "/signup" },
      { label: "Log in", href: "/login" },
      { label: "Client portal", href: "/portal" },
    ],
  },
];

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/creotool26?igsh=NjN0eWxwZ2VqbWJ3",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/creo-tool-3bb3b841b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1GKDeenkvC/",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/creotool",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
];

/** Oversized wordmark that rises out of a mask when the footer comes into view. */
function FooterWordmark() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden="true" className="relative select-none overflow-hidden">
      <motion.div
        initial={reduce ? false : { y: "70%", opacity: 0 }}
        whileInView={{ y: "0%", opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-gradient-to-b from-[#3A56B8] via-[#1B2C6E] to-site-abyss light:from-[#90997F] light:via-[#5E6A4C] bg-clip-text text-center text-[27vw] font-black leading-[0.78] tracking-[-0.07em] text-transparent lg:text-[22rem]"
      >
        creo.
      </motion.div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      to={href}
      className="group inline-flex items-center gap-1.5 text-sm text-site-mist transition-colors duration-300 hover:text-site-ink"
    >
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-[length:100%_1px]">
        {children}
      </span>
      <ArrowUpRight className="size-3 -translate-x-1 text-site-blue opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
    </Link>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer data-footer className="relative isolate overflow-hidden bg-site-abyss text-site-ink">
      <div aria-hidden="true" className="creo-seam absolute inset-x-0 top-0" />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[-180px] -z-10 h-[460px] w-[min(1000px,120vw)] -translate-x-1/2 rounded-full bg-site-blue-deep/[0.14] blur-[120px]"
      />

      <div className="mx-auto max-w-[1440px] px-6 pt-16 sm:px-8 sm:pt-24 lg:px-12">
        {/* 1. Closing call to action */}
        <MaskReveal from="bottom" zoom={1.04} duration={1.1} className="rounded-[32px]">
          <div className="creo-beam relative overflow-hidden rounded-[32px] border border-hi/10 bg-gradient-to-br from-site-panel via-site-panel-2 to-site-deep px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            <div
              aria-hidden="true"
              className="creo-grid-bg absolute inset-0 [mask-image:radial-gradient(70%_80%_at_85%_10%,#000,transparent)]"
            />
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 size-[420px] rounded-full bg-site-blue/30 blur-[100px]"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-32 left-10 size-[360px] rounded-full bg-site-sky/10 blur-[100px]"
            />

            <div className="relative grid grid-cols-1 items-end gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <span className="creo-eyebrow"><ScrambleText text="Ready when you are" /></span>
                <SplitText
                  as="h2"
                  text="Stop managing the chaos. Start operating the momentum."
                  accent={["operating", "momentum."]}
                  className="mt-6 block text-3xl font-black leading-[1.05] tracking-[-0.035em] text-site-ink sm:text-5xl lg:text-[3.6rem]"
                />
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-site-mist-2 sm:text-base">
                  Join 50+ modern creative agencies running content production, client sign-offs, and
                  unit economics on CREO OS.
                </p>
              </div>

              <div className="flex flex-col gap-5 lg:col-span-5 lg:items-end">
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:justify-end">
                  <Link
                    to="/pricing"
                    className="creo-btn-primary group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold"
                  >
                    <RollText>Deploy CREO in your agency</RollText>
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="creo-btn-ghost group inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold"
                  >
                    <MessageCircle className="size-4 text-site-sky" />
                    <RollText>Schedule a live demo</RollText>
                  </a>
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-site-mist lg:justify-end">
                  {["Month-to-month", "First batch in 7 days", "Pause or cancel anytime"].map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-site-blue-light" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </MaskReveal>

        {/* 2. Directory */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 py-16 sm:grid-cols-3 sm:py-20 lg:grid-cols-12 lg:gap-x-10">
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <Link to="/" aria-label="Creo home" className="inline-flex items-baseline text-3xl font-black tracking-[-0.04em]">
              creo
              <span className="ml-[1px] inline-block size-[0.34em] rounded-full bg-gradient-to-br from-site-blue-light to-site-blue-deep shadow-[0_0_14px_2px_rgba(79,123,255,0.6)]" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-site-mist">
              Your creative growth engine. High-converting reels, studio carousels, and content
              operations delivered on autopilot.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-2xl border border-hi/[0.08] bg-hi/[0.03] px-4 py-3 transition-colors duration-300 hover:border-site-blue/50 hover:bg-hi/[0.05]"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-site-blue/15 text-site-blue-light ring-1 ring-inset ring-site-blue/30">
                  <MessageCircle className="size-4" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-site-mist">WhatsApp</span>
                  <span className="text-sm font-semibold text-site-ink">Chat with us</span>
                </span>
              </a>
              <a
                href="tel:+919941999415"
                className="group flex items-center gap-3 rounded-2xl border border-hi/[0.08] bg-hi/[0.03] px-4 py-3 transition-colors duration-300 hover:border-site-blue/50 hover:bg-hi/[0.05]"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-site-blue/15 text-site-blue-light ring-1 ring-inset ring-site-blue/30">
                  <Phone className="size-4" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-site-mist">Call</span>
                  <span className="text-sm font-semibold text-site-ink">+91 99419 99415</span>
                </span>
              </a>
            </div>

            <div className="mt-6 flex flex-col gap-2 text-xs text-site-mist">
              <span className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0 text-site-blue" /> Bangalore, India
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-3.5 shrink-0 text-site-blue" /> Mon – Sat · 9:30 AM – 7:00 PM IST
              </span>
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="lg:col-span-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-site-ink">{group.title}</h3>
              <ul className="mt-5 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-site-ink">Follow</h3>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.label}
                    className="flex size-11 items-center justify-center rounded-full border border-hi/10 bg-hi/[0.03] text-site-mist-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-site-blue/60 hover:bg-site-blue/15 hover:text-hi hover:shadow-[0_8px_24px_-8px_rgba(79,123,255,0.7)]"
                  >
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={social.path} />
                    </svg>
                    <span className="sr-only">{social.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Signature wordmark */}
      <div className="mx-auto max-w-[1440px] px-2 sm:px-6">
        <FooterWordmark />
      </div>

      {/* 4. Legal bar */}
      <div className="border-t border-hi/[0.07]">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-4 px-6 py-6 text-xs text-site-mist sm:flex-row sm:justify-between sm:px-8 lg:px-12">
          <p>© {year} Creo. All rights reserved.</p>
          <ul className="flex items-center gap-6">
            <li>
              <Link to="/privacy" className="transition-colors hover:text-site-ink">Privacy</Link>
            </li>
            <li>
              <Link to="/terms" className="transition-colors hover:text-site-ink">Terms</Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => smoothScrollTo(0)}
                className="group inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-site-ink"
              >
                Back to top
                <span className="flex size-7 items-center justify-center rounded-full border border-hi/10 transition-colors group-hover:border-site-blue/60 group-hover:bg-site-blue/15">
                  <ArrowUp className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
