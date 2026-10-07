import { QueryClient } from "@tanstack/react-query";
import { HttpError } from "./http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Portal data should survive normal page navigation. Mutations explicitly
      // invalidate the records they change, so repeated GETs only add latency.
      staleTime: 2 * 60_000,
      gcTime: 30 * 60_000,
      // Client errors (401/403/404/409...) are deterministic, so retrying them only
      // delays the UI. Retry once for network failures and 5xx responses.
      retry: (failureCount, error) => {
        if (error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name)) return false;
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});
