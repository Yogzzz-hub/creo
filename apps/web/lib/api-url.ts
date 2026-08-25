export const getApiUrl = (): string => {
  let url = "";

  // If in browser, detect localhost vs production dynamically
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      url = "http://127.0.0.1:8000";
    } else {
      url = process.env.NEXT_PUBLIC_API_URL || "https://creo-production-0e62.up.railway.app";
    }
  } else {
    // Server-side (SSR / Edge)
    url =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://127.0.0.1:8000"
        : "https://creo-production-0e62.up.railway.app");
  }

  // Prevent Node.js loopback resolution issues (IPv6 ::1 vs IPv4 127.0.0.1)
  if (url.includes("localhost:8000")) {
    url = url.replace("localhost:8000", "127.0.0.1:8000");
  }

  return url;
};
