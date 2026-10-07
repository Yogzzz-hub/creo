import { recoverStaleChunk } from "../lib/chunk-recovery";
import { type ComponentType, type LazyExoticComponent, lazy } from "react";

// biome-ignore lint/suspicious/noExplicitAny: page components take arbitrary props
type AnyComponent = ComponentType<any>;

export type PreloadableComponent<T extends AnyComponent> = LazyExoticComponent<T> & {
  preload: () => Promise<unknown>;
};

/**
 * React.lazy plus a `preload()` handle so layouts can warm route chunks during
 * idle time. The browser caches the module, so a later render resolves instantly.
 */
export function lazyModule<T extends AnyComponent>(factory: () => Promise<{ default: T }>): PreloadableComponent<T> {
  let pending: Promise<{ default: T }> | undefined;
  const load = () => pending ??= factory().catch(error => {
    if (recoverStaleChunk(error)) return new Promise<{ default: T }>(() => {});
    pending = undefined;
    throw error;
  });
  const component = lazy(load) as PreloadableComponent<T>;
  component.preload = load;
  return component;
}

function lazyPage<T extends AnyComponent>(factory: () => Promise<T>): PreloadableComponent<T> {
  return lazyModule(() => factory().then(component => ({ default: component })));
}

/** Run work once the browser is idle so it never competes with the current page. */
export function whenIdle(work: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(work, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(work, 800);
  return () => clearTimeout(id);
}

// ── Public marketing ─────────────────────────────────────────────────────────
export const PricingPage = lazyPage(() =>
  import("../pages/public/PricingPage").then((m) => m.PricingPage),
);
export const PortfolioPage = lazyPage(() =>
  import("../pages/public/PortfolioPage").then((m) => m.PortfolioPage),
);
export const ClientsPage = lazyPage(() =>
  import("../pages/public/ClientsPage").then((m) => m.ClientsPage),
);
export const AboutPage = lazyPage(() =>
  import("../pages/public/AboutPage").then((m) => m.AboutPage),
);
export const FaqPage = lazyPage(() =>
  import("../pages/public/FaqPage").then((m) => m.FaqPage),
);
export const TermsPage = lazyPage(() =>
  import("../pages/public/TermsPrivacyPages").then((m) => m.TermsPage),
);
export const PrivacyPage = lazyPage(() =>
  import("../pages/public/TermsPrivacyPages").then((m) => m.PrivacyPage),
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const AuthPage = lazyPage(() => import("../pages/auth/AuthPage").then((m) => m.AuthPage));
export const GoogleCallbackPage = lazyPage(() =>
  import("../pages/auth/GoogleCallbackPage").then((m) => m.GoogleCallbackPage),
);

// ── Onboarding ───────────────────────────────────────────────────────────────
export const OnboardingView = lazyPage(() =>
  import("../features/onboarding/OnboardingView").then((m) => m.OnboardingView),
);

// ── Client portal ────────────────────────────────────────────────────────────
export const PortalDashboardPage = lazyPage(() =>
  import("../pages/portal/PortalDashboardPage").then((m) => m.PortalDashboardPage),
);
export const PortalDeliverablesPage = lazyPage(() =>
  import("../pages/portal/PortalDeliverablesPage").then((m) => m.PortalDeliverablesPage),
);
export const PortalCalendarPage = lazyPage(() =>
  import("../pages/portal/PortalCalendarPage").then((m) => m.PortalCalendarPage),
);
export const PortalCreativePodPage = lazyPage(() =>
  import("../pages/portal/PortalCreativePodPage").then((m) => m.PortalCreativePodPage),
);
export const PortalPaymentsPage = lazyPage(() =>
  import("../pages/portal/PortalPaymentsPage").then((m) => m.PortalPaymentsPage),
);
export const PortalSupportPage = lazyPage(() =>
  import("../pages/portal/PortalSupportPage").then((m) => m.PortalSupportPage),
);
export const PortalAccountPage = lazyPage(() =>
  import("../pages/portal/PortalAccountPage").then((m) => m.PortalAccountPage),
);
export const PortalBrandDNAPage = lazyPage(() =>
  import("../pages/portal/PortalBrandDNAPage").then((m) => m.PortalBrandDNAPage),
);
export const PortalLibraryPage = lazyPage(() =>
  import("../pages/portal/PortalLibraryPage").then((m) => m.PortalLibraryPage),
);

const PORTAL_CORE_PAGES = [
  PortalDashboardPage,
  PortalDeliverablesPage,
  PortalCalendarPage,
  PortalPaymentsPage,
];

/** Warm common portal routes without downloading the entire application after login. */
export function preloadPortalPages(options: { includeOnboarding?: boolean } = {}): void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || connection?.effectiveType?.includes("2g")) return;
  if (options.includeOnboarding) {
    void OnboardingView.preload().catch(() => {});
    return;
  }
  for (const page of PORTAL_CORE_PAGES) void page.preload().catch(() => {});
}
