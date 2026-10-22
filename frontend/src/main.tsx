import { recoverStaleChunk } from "./lib/chunk-recovery";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { runAppOAuthHandoff } from "./lib/app-oauth";
import { isNativeApp } from "./lib/native";
import { queryClient } from "./lib/query-client";
import "./styles/tokens.css";

window.addEventListener("vite:preloadError", (event) => {
  if (recoverStaleChunk((event as Event & { payload: unknown }).payload)) event.preventDefault();
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

// In the system browser, a sign-in the native app started is handed back to the app.
if (isNativeApp || !runAppOAuthHandoff()) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
  // The launch splash waits for the first render (capacitor.config.ts), errors included.
  if (isNativeApp) void import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 200 }));
}
