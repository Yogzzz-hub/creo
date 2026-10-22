/**
 * The native app shell (Capacitor). The same build runs on the website and inside
 * the Android and iOS apps; these helpers are where the two differ.
 */
import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();

/**
 * The deployed website. Inside the app the page is served from the device
 * (https://localhost on Android, capacitor://localhost on iOS), so API calls, OAuth
 * return pages and links meant for other people go to this origin instead.
 */
export const PUBLIC_WEB_ORIGIN = (
  (import.meta.env.VITE_PUBLIC_WEB_URL as string | undefined) || "https://creo.yogalakshmibaskar20.workers.dev"
).replace(/\/$/, "");

/** Optional API server for the app builds (e.g. http://10.0.2.2:8000 for an emulator). */
export const NATIVE_API_URL = ((import.meta.env.VITE_NATIVE_API_URL as string | undefined) || "").replace(/\/$/, "");

/** The URL scheme the apps register; OAuth flows return to the app through it. */
export const APP_URL_SCHEME = "com.creo.app";

/** Absolute link to a page of the website, for sharing or copying. */
export function publicUrl(path: string): string {
  return `${isNativeApp ? PUBLIC_WEB_ORIGIN : window.location.origin}${path}`;
}
