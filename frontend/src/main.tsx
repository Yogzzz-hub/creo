import { recoverStaleChunk } from "./lib/chunk-recovery";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { queryClient } from "./lib/query-client";
import { apiUrl } from "./lib/http";
import "./styles/tokens.css";

// Pre-warm backend instance on page load & when user returns to tab
function prewarmBackend() {
  try {
    fetch(apiUrl("/api/v1/health"), { method: "GET" }).catch(() => {});
  } catch {}
}
prewarmBackend();
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") prewarmBackend();
  });
}

window.addEventListener("vite:preloadError", (event) => {
  if (recoverStaleChunk((event as Event & { payload: unknown }).payload)) event.preventDefault();
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
