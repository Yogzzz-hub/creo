export const getApiUrl = (): string => {
  // Directly prioritize configured Railway API URL, with zero localhost fallbacks
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_API_URL ||
    "https://creo-production-0e62.up.railway.app";

  return url.replace(/\/$/, "");
};
