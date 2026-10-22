/**
 * OAuth inside the native app. Google refuses sign-in in an embedded WebView and the
 * Google and Meta redirect URIs are pages of the website, so the app runs these flows
 * in the system browser, through the website:
 *
 *   app ── Browser.open ──▶ website /app-oauth?to=<consent URL>   (marks the flow as the app's)
 *       ──▶ provider consent ──▶ website callback page
 *       ──▶ com.creo.app://app/<callback path>?code=…&state=…    (back into the app)
 *
 * The app then finishes on its own copy of the callback page, which checks the state
 * (and Meta's verifier) saved before leaving and exchanges the code as the website does.
 */
import { APP_URL_SCHEME, PUBLIC_WEB_ORIGIN, isNativeApp } from "./native";

const START_PATH = "/app-oauth";
const PENDING_KEY = "creo-app-oauth";
const PENDING_TTL_MS = 15 * 60_000;
// Only consent screens can be started through the website, so it is not an open redirect.
const PROVIDER_HOSTS = new Set(["accounts.google.com", "www.facebook.com", "www.instagram.com"]);
// The website pages the providers return to: Google's redirect URI and INSTAGRAM_REDIRECT_URI.
const RETURN_PATHS = new Set(["/auth/google/callback", "/auth/callback/google", "/portal/account/instagram"]);
// The system browser can report closing just before the app link arrives.
const RETURN_GRACE_MS = 1500;

let returned = false;

/**
 * Send the user to a provider's consent screen. On the website this leaves the page.
 * In the app it opens the system browser and settles like a page unload: it never
 * resolves once the flow returns to the app, and throws if the browser is closed first.
 */
export async function goToOAuthProvider(url: string): Promise<void> {
  if (!isNativeApp) {
    window.location.assign(url);
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  returned = false;
  let closed = () => {};
  const finished = new Promise<void>((resolve) => {
    closed = resolve;
  });
  const listener = await Browser.addListener("browserFinished", () => closed());
  try {
    await Browser.open({ url: `${PUBLIC_WEB_ORIGIN}${START_PATH}?to=${encodeURIComponent(url)}` });
    await finished;
  } finally {
    void listener.remove();
  }
  await new Promise((resolve) => setTimeout(resolve, RETURN_GRACE_MS));
  if (returned) return new Promise<never>(() => {});
  throw new Error("The sign-in window was closed before it finished. Please try again.");
}

/** The in-app route for an app link that finishes an OAuth flow, or null for any other URL. */
export function takeOAuthReturn(url: string): string | null {
  let link: URL;
  try {
    link = new URL(url);
  } catch {
    return null;
  }
  if (link.protocol !== `${APP_URL_SCHEME}:` || link.host !== "app" || !RETURN_PATHS.has(link.pathname)) return null;
  returned = true;
  return link.pathname + link.search;
}

/**
 * On the website, in the system browser: run the browser's half of a flow the app
 * started. Returns true when it has taken over the page and the web app must not start.
 */
export function runAppOAuthHandoff(): boolean {
  const { pathname, search } = window.location;

  if (pathname === START_PATH) {
    let target: URL | null = null;
    try {
      target = new URL(new URLSearchParams(search).get("to") ?? "");
    } catch {
      return false;
    }
    if (target.protocol !== "https:" || !PROVIDER_HOSTS.has(target.hostname)) return false;
    try {
      sessionStorage.setItem(PENDING_KEY, String(Date.now()));
    } catch {
      return false;
    }
    window.location.replace(target.href);
    return true;
  }

  if (!RETURN_PATHS.has(pathname) || !takePending()) return false;
  const appLink = `${APP_URL_SCHEME}://app${pathname}${search}`;
  renderReturnPage(appLink);
  // Browsers may block opening an app without a tap; the page's button covers that.
  window.location.replace(appLink);
  return true;
}

function takePending(): boolean {
  try {
    const startedAt = Number(sessionStorage.getItem(PENDING_KEY));
    sessionStorage.removeItem(PENDING_KEY);
    return Date.now() - startedAt < PENDING_TTL_MS;
  } catch {
    return false;
  }
}

function renderReturnPage(appLink: string) {
  document.title = "Return to Creo";
  const page = document.createElement("main");
  page.style.cssText =
    "min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;background:#0f0e0c;color:#f5eee3;font-family:Inter,system-ui,sans-serif";
  const heading = document.createElement("h1");
  heading.textContent = "Back to the app";
  heading.style.cssText = "margin:0;font-size:28px;font-weight:600";
  const note = document.createElement("p");
  note.textContent = "Creo will finish signing you in.";
  note.style.cssText = "margin:0;opacity:.7";
  const link = document.createElement("a");
  link.href = appLink;
  link.textContent = "Open the Creo app";
  link.style.cssText =
    "margin-top:8px;padding:12px 24px;border-radius:999px;background:#f5eee3;color:#0f0e0c;font-weight:600;text-decoration:none";
  page.append(heading, note, link);
  (document.getElementById("root") ?? document.body).replaceChildren(page);
}
