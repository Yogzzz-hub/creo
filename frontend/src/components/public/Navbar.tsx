import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Link, useNavigate, useLocation } from "react-router";
import { ArrowRight, ArrowUpRight, LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";
import { getRoleHome } from "../auth/ProtectedRoute";
import { RollText } from "../motion";
import { ThemeToggle } from "../ui/ThemeToggle";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "About", href: "/about" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="Creo home"
      className="group relative flex items-baseline text-[1.6rem] font-black tracking-[-0.04em] text-site-ink"
    >
      creo
      <span className="relative ml-[1px] inline-block size-[0.36em] translate-y-[-0.02em] rounded-full bg-gradient-to-br from-site-blue-light to-site-blue-deep shadow-[0_0_14px_2px_rgba(79,123,255,0.65)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:scale-125" />
    </Link>
  );
}

export function Navbar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    // Tuck the bar away while reading down the page, bring it back on any scroll up
    if (y > 320 && y > prev + 2) setHidden(true);
    else if (y < prev - 2 || y <= 320) setHidden(false);
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setSheetOpen(false), [location.pathname]);

  useEffect(() => {
    if (!sheetOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheetOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setSheetOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [sheetOpen]);

  const userHome = getRoleHome(user?.role);
  const userPortalLabel =
    user?.role === "admin" || user?.role === "super_admin"
      ? "Admin Console"
      : user?.role === "team_member" || user?.role === "team_lead" || user?.role === "editor" || user?.role === "designer"
      ? "Team Dashboard"
      : "Client Portal";

  const confirm = useConfirm();

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign Out of Creo?",
      description: "Are you sure you want to sign out? You will need to log back in to access your dashboard.",
      confirmText: "Sign Out",
      cancelText: "Stay Logged In",
      tone: "warning",
      icon: "logout",
    });
    if (!ok) return;

    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  const isHidden = hidden && !sheetOpen;

  return (
    <header className="pointer-events-none sticky top-0 z-50 h-[76px] w-full sm:h-[84px]">
      <motion.div
        initial={reduce ? false : { y: -40, opacity: 0 }}
        animate={{ y: isHidden ? "-130%" : 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="pointer-events-auto absolute inset-x-0 top-0 px-3 pt-3 sm:px-5 sm:pt-4"
      >
        <nav
          aria-label="Primary"
          className={`relative mx-auto flex h-[56px] items-center justify-between rounded-full pl-5 pr-2 backdrop-blur-xl backdrop-saturate-150 transition-[max-width,box-shadow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:pl-6 ${
            scrolled || sheetOpen ? "creo-glass-strong max-w-[1080px]" : "creo-glass max-w-[1320px]"
          }`}
        >
          {/* Top-edge sheen that gives the glass its thickness */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-hi/40 to-transparent"
          />

          <Wordmark />

          <ul
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 lg:flex"
            onMouseLeave={() => setHovered(null)}
          >
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <li key={link.href} className="relative">
                  <Link
                    to={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onMouseEnter={() => setHovered(link.href)}
                    className={`group relative z-10 block rounded-full px-4 py-2 text-[13.5px] tracking-[-0.01em] transition-colors duration-300 ${
                      isActive ? "font-semibold text-hi" : "font-medium text-site-mist-2 hover:text-hi"
                    }`}
                  >
                    {hovered === link.href && (
                      <motion.span
                        layoutId="nav-hover-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-hi/[0.07] ring-1 ring-inset ring-hi/10"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <RollText>{link.label}</RollText>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-dot"
                        className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-site-blue-light shadow-[0_0_10px_2px_rgba(79,123,255,0.8)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle variant="site" />
            {user ? (
              <>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium text-site-mist-2 transition-colors hover:text-hi disabled:opacity-60"
                >
                  <LogOut className="size-4" />
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
                <Link
                  to={userHome}
                  className="creo-btn-primary group inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold"
                >
                  <RollText>{userPortalLabel}</RollText>
                  <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="group rounded-full px-4 py-2 text-[13.5px] font-medium text-site-mist-2 transition-colors hover:text-hi"
                >
                  <RollText>Log in</RollText>
                </Link>
                <Link
                  to="/signup"
                  className="creo-btn-primary group inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold"
                >
                  <RollText>Get started</RollText>
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle variant="site" className="size-11" />
          {/* Mobile menu trigger: two bars that fold into an X */}
          <button
            type="button"
            onClick={() => setSheetOpen(!sheetOpen)}
            ref={menuButtonRef}
            aria-expanded={sheetOpen}
            aria-controls="public-mobile-menu"
            aria-label={sheetOpen ? "Close menu" : "Open menu"}
            className="relative flex size-11 cursor-pointer items-center justify-center rounded-full bg-hi/[0.06] ring-1 ring-inset ring-hi/10 transition-colors hover:bg-hi/10 lg:hidden"
          >
            <span className="relative block h-3 w-[18px]">
              <motion.span
                className="absolute left-0 top-0 block h-[1.5px] w-full rounded-full bg-site-ink"
                animate={sheetOpen ? { rotate: 45, y: 5.25 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              />
              <motion.span
                className="absolute bottom-0 left-0 block h-[1.5px] w-full rounded-full bg-site-ink"
                animate={sheetOpen ? { rotate: -45, y: -5.25 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            </span>
          </button>
          </div>
        </nav>

        {/* Mobile drawer */}
        <AnimatePresence>
          {sheetOpen && (
            <motion.div
              key="mobile-menu"
              id="public-mobile-menu"
              initial={{ opacity: 0, y: -10, clipPath: "inset(0% 0% 100% 0% round 28px)" }}
              animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 28px)" }}
              exit={{ opacity: 0, y: -8, clipPath: "inset(0% 0% 100% 0% round 28px)" }}
              transition={{ duration: 0.55, ease: EASE }}
              className="creo-glass-strong mx-auto mt-2 flex max-h-[calc(100dvh-6rem)] max-w-[1080px] flex-col gap-2 overflow-y-auto overscroll-contain rounded-[28px] p-3 lg:hidden"
            >
              <motion.nav
                aria-label="Mobile navigation"
                className="flex flex-col"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}
              >
                {NAV_LINKS.map((link, i) => {
                  const isActive = location.pathname === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      variants={{
                        hidden: { opacity: 0, y: 14 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                      }}
                    >
                      <Link
                        to={link.href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setSheetOpen(false)}
                        className={`group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-colors ${
                          isActive ? "bg-hi/[0.07] text-hi" : "text-site-mist-2 hover:bg-hi/[0.05] hover:text-hi"
                        }`}
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-[11px] text-site-blue">0{i + 1}</span>
                          <span className="text-xl font-semibold tracking-[-0.02em]">{link.label}</span>
                        </span>
                        <ArrowUpRight className="size-4 opacity-40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.nav>

              <div className="mt-1 grid grid-cols-2 gap-2 border-t border-hi/10 pt-3">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        handleLogout();
                      }}
                      disabled={loggingOut}
                      className="creo-btn-ghost flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium"
                    >
                      <LogOut className="size-4" />
                      {loggingOut ? "Logging out..." : "Log out"}
                    </button>
                    <Link
                      to={userHome}
                      onClick={() => setSheetOpen(false)}
                      className="creo-btn-primary flex min-h-12 items-center justify-center rounded-full text-sm font-semibold"
                    >
                      {userPortalLabel}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setSheetOpen(false)}
                      className="creo-btn-ghost flex min-h-12 items-center justify-center rounded-full text-sm font-medium"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setSheetOpen(false)}
                      className="creo-btn-primary flex min-h-12 items-center justify-center gap-1.5 rounded-full text-sm font-semibold"
                    >
                      Get started <ArrowRight className="size-4" />
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
