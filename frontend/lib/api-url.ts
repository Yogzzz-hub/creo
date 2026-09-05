
export const getApiUrl = (): string => {
  // Prioritize configured API URL, with fallback to production Render API
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_API_URL ||
    "https://creo-ev42.onrender.com";

  return url.replace(/\/$/, "");
};
