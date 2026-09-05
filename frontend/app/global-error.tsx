"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: "#F8FAFC",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "28rem" }}>
          <div
            style={{
              borderRadius: "1rem",
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
              padding: "2rem",
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div
                style={{
                  width: "4rem",
                  height: "4rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "1rem",
                  backgroundColor: "#E8F4FD",
                }}
              >
                <AlertTriangle size={32} color="#2B7BC4" />
              </div>

              <h2
                style={{
                  marginTop: "1.5rem",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#0D2137",
                }}
              >
                Application Error
              </h2>
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.875rem",
                  lineHeight: "1.625",
                  color: "#64748B",
                  maxWidth: "24rem",
                }}
              >
                A critical error occurred in the application. Please try
                refreshing the page or return to the home page.
              </p>

              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  width: "100%",
                }}
              >
                <button
                  onClick={reset}
                  style={{
                    width: "100%",
                    height: "2.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    borderRadius: "0.5rem",
                    backgroundColor: "#2B7BC4",
                    color: "#FFFFFF",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#2368A8";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#2B7BC4";
                  }}
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
                <a
                  href="/"
                  style={{
                    width: "100%",
                    height: "2.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #E2E8F0",
                    backgroundColor: "transparent",
                    color: "#0D2137",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#F1F5F9";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Home size={16} />
                  Return Home
                </a>
              </div>

              {error.digest && (
                <p
                  style={{
                    marginTop: "1.5rem",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    color: "#94A3B8",
                  }}
                >
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
