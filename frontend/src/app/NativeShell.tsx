import { SystemBars, SystemBarsStyle, registerPlugin } from "@capacitor/core";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { takeOAuthReturn } from "../lib/app-oauth";
import { isNativeApp } from "../lib/native";

/** Paints the strips behind the status and navigation bars (android/…/SystemChromePlugin.java, ios/App/App/MainViewController.swift). */
const SystemChrome = registerPlugin<{ setBackgroundColor(options: { color: string }): Promise<void> }>("SystemChrome");

const HANDLED_LAUNCH_KEY = "creo-handled-launch-url";

/**
 * Wires the native app shell to the web app: OAuth return links, the Android back
 * button and system bars that follow the theme. Renders nothing and does nothing on
 * the website.
 */
export function NativeShell() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isNativeApp) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    // index.html and theme.tsx keep theme-color in step with the page background.
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const paintBars = () => {
      const light = document.documentElement.dataset.theme === "light";
      const color = themeColor?.getAttribute("content") || (light ? "#f5eee3" : "#0f0e0c");
      void SystemBars.setStyle({ style: light ? SystemBarsStyle.Light : SystemBarsStyle.Dark })
        .then(() => SystemChrome.setBackgroundColor({ color }))
        .catch(() => {});
    };
    paintBars();
    if (themeColor) {
      const observer = new MutationObserver(paintBars);
      observer.observe(themeColor, { attributes: true, attributeFilter: ["content"] });
      cleanups.push(() => observer.disconnect());
    }

    void (async () => {
      const [{ App }, { Browser }] = await Promise.all([import("@capacitor/app"), import("@capacitor/browser")]);
      if (disposed) return;

      const openAppLink = (url: string) => {
        const path = takeOAuthReturn(url);
        if (!path) return;
        void Browser.close().catch(() => {});
        navigateRef.current(path, { replace: true });
      };

      const handles = await Promise.all([
        App.addListener("appUrlOpen", ({ url }) => openAppLink(url)),
        App.addListener("backButton", ({ canGoBack }) => {
          // An open dialog closes first, as Escape would close it.
          if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          } else if (canGoBack) {
            window.history.back();
          } else {
            void App.minimizeApp();
          }
        }),
      ]);
      if (disposed) {
        for (const handle of handles) void handle.remove();
        return;
      }
      cleanups.push(() => {
        for (const handle of handles) void handle.remove();
      });

      // An app link can also cold-start the app (if Android stopped it while the
      // browser was open). A reload must not replay a code that was already used.
      const launch = await App.getLaunchUrl();
      if (disposed || !launch?.url) return;
      try {
        if (sessionStorage.getItem(HANDLED_LAUNCH_KEY) === launch.url) return;
        sessionStorage.setItem(HANDLED_LAUNCH_KEY, launch.url);
      } catch {
        // Storage unavailable: handle it once for this page load.
      }
      openAppLink(launch.url);
    })();

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}
