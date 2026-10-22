import type { CapacitorConfig } from "@capacitor/cli";

// Obsidian, the dark brand background: shown before the web app paints its own.
const OBSIDIAN = "#0F0E0C";

const config: CapacitorConfig = {
  appId: "com.creo.app",
  appName: "Creo",
  webDir: "dist",
  backgroundColor: OBSIDIAN,
  server: {
    // Razorpay Checkout navigates inside its frame; keep those pages in the app
    // instead of handing them to the system browser.
    allowNavigation: ["*.razorpay.com"],
  },
  ios: {
    // Keep the page clear of the notch and home indicator, as WebKit does by default
    // for pages without viewport-fit=cover.
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      // NativeShell hides it once the web app has rendered.
      launchAutoHide: false,
      backgroundColor: OBSIDIAN,
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    SystemBars: {
      // The page has no viewport-fit=cover, so Android pads it clear of the bars.
      insetsHandling: "css",
      style: "DARK",
    },
  },
};

export default config;
