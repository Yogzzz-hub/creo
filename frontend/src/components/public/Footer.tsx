import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowUp } from "lucide-react";
import { ScrollFlipText } from "../motion/ScrollFlipText";
import { smoothScrollTo } from "../motion/SmoothScroll";
import { SCREEN_IMAGES } from "../stage3d/registry";
import { DISPLAY, PillLink } from "./StagePieces";

// The footer's 3D loads on its own, only once the footer is close to view
const FooterScene = lazy(() => import("../stage3d/FooterScene"));

const WHATSAPP_URL = "https://wa.me/919941999415";

/** Small uppercase mono labels, as in the reference footer */
const MONO = "font-['DM_Mono',ui-monospace,monospace] text-[11px] uppercase leading-relaxed tracking-[0.06em] sm:text-xs";

const LINK_GROUPS = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "Our work", href: "/work" },
      { label: "Clients", href: "/clients" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Free sample", href: "/signup?intent=sample" },
      { label: "Create account", href: "/signup" },
      { label: "Log in", href: "/login" },
      { label: "Client portal", href: "/portal" },
    ],
  },
];

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/creotool26?igsh=NjN0eWxwZ2VqbWJ3" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/creo-tool-3bb3b841b?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
  { label: "Facebook", href: "https://www.facebook.com/share/1GKDeenkvC/" },
  { label: "X", href: "https://x.com/creotool" },
];

const LINK = `${MONO} text-site-ink transition-opacity duration-300 hover:opacity-55`;

/** True once the element has come within `margin` of the viewport (and stays true). */
function useNearViewport(margin = "600px") {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, near]);
  return [ref, near] as const;
}

/**
 * Site footer: a closing line with two calls to action, a mono directory,
 * and a full-bleed wordmark with obsidian rocks, a phone and a gold coin
 * floating in front of it, on an ivory-to-amber dusk gradient (same in both
 * themes).
 */
export function Footer() {
  const year = new Date().getFullYear();
  const [markRef, nearMark] = useNearViewport();

  return (
    <footer data-footer className="footer-dusk relative isolate overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12">
        {/* 1. Closing line */}
        <div className="grid gap-10 border-b border-site-ink/15 pb-14 pt-20 sm:pt-24 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className={`${MONO} text-site-mist`}>Ready when you are</p>
            <ScrollFlipText
              as="h2"
              text="Stop managing the chaos. Start operating the momentum."
              className={`mt-5 block max-w-4xl text-[clamp(2.4rem,5.2vw,4.75rem)] leading-[0.98] ${DISPLAY}`}
            />
            <p className="mt-6 max-w-xl text-base leading-relaxed text-site-mist sm:text-lg">
              Join 50+ modern creative agencies running content production, client sign-offs and unit economics on CREO OS.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
            <PillLink to="/pricing">Deploy CREO in your agency</PillLink>
            <PillLink href={WHATSAPP_URL}>Schedule a live demo</PillLink>
            <p className={`${MONO} mt-2 text-site-mist lg:text-right`}>Month-to-month · First batch in 7 days · Pause anytime</p>
          </div>
        </div>

        {/* 2. Directory */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 pt-12 sm:grid-cols-4 lg:grid-cols-12">
          {LINK_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="lg:col-span-2">
              <h3 className={`${MONO} text-site-mist`}>{group.title}</h3>
              <ul className="mt-3 flex flex-col gap-1.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className={LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="lg:col-span-2">
            <h3 className={`${MONO} text-site-mist`}>Contact</h3>
            <ul className="mt-3 flex flex-col gap-1.5">
              <li>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="tel:+919941999415" className={LINK}>
                  +91 99419 99415
                </a>
              </li>
              <li className={`${MONO} text-site-mist`}>Bangalore, India</li>
              <li className={`${MONO} text-site-mist`}>Mon–Sat · 9:30–19:00 IST</li>
            </ul>
          </div>

          <ul className="col-span-2 flex flex-wrap justify-between gap-x-6 gap-y-3 sm:col-span-4 lg:col-span-4">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Legal row */}
        <div className={`${MONO} flex flex-col gap-4 pt-16 text-site-mist sm:flex-row sm:items-center sm:justify-between`}>
          <p>© {year} Creo. All rights reserved.</p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <li>
              <Link to="/terms" className={LINK}>
                Terms & conditions
              </Link>
            </li>
            <li>
              <Link to="/privacy" className={LINK}>
                Privacy policy
              </Link>
            </li>
            <li>
              <button type="button" onClick={() => smoothScrollTo(0)} className={`${LINK} inline-flex cursor-pointer items-center gap-1.5`}>
                Back to top
                <ArrowUp className="size-3.5" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* 4. Wordmark, with 3D props floating in front of it */}
      <div ref={markRef} className="relative mt-16 sm:mt-20">
        <div className="overflow-hidden">
          <p
            aria-hidden="true"
            className="-mb-[0.08em] select-none whitespace-nowrap text-center text-[34vw] font-black leading-[0.7] tracking-[-0.07em] text-[#120d09]"
          >
            creo<span className="text-[#b8722f]">.</span>
          </p>
        </div>
        {nearMark && (
          <Suspense fallback={null}>
            <FooterScene image={SCREEN_IMAGES[0] ?? ""} className="absolute inset-x-0 bottom-0 h-[150%]" />
          </Suspense>
        )}
      </div>
    </footer>
  );
}
