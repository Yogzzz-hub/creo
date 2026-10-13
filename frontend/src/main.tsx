import { recoverStaleChunk } from "./lib/chunk-recovery";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { queryClient } from "./lib/query-client";
import "./styles/tokens.css";

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
