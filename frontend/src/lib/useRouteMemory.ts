import { useEffect } from "react";
import { useLocation } from "react-router";

const STORAGE_KEY_PREFIX = "creo_last_route";

/**
 * Passively saves the current route to sessionStorage on every navigation.
 * Call this hook inside layout components (PortalLayout, OpsLayout) to
 * automatically track where the user is.
 *
 * On login, use `getSavedRoute()` to retrieve and redirect to the last
 * visited page instead of the default role home.
 *
 * Uses sessionStorage (not localStorage) so routes clear on tab close,
 * avoiding stale redirects from old sessions.
 */
export function useRouteMemory() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search;

    // Don't save auth-related routes (login, signup, callback, etc.)
    if (
      path.startsWith("/login") ||
      path.startsWith("/signup") ||
      path.startsWith("/auth") ||
      path === "/"
    ) {
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY_PREFIX, path);
    } catch {
      // sessionStorage unavailable (e.g., private browsing quota)
    }
  }, [location.pathname, location.search]);
}

/**
 * Retrieve the last saved route from sessionStorage.
 * Returns null if no route was saved or if sessionStorage is unavailable.
 *
 * @param clearAfterRead - If true, removes the saved route after reading.
 *                         Prevents infinite redirect loops on role mismatch.
 */
export function getSavedRoute(clearAfterRead = false): string | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY_PREFIX);
    if (saved && clearAfterRead) {
      sessionStorage.removeItem(STORAGE_KEY_PREFIX);
    }
    return saved || null;
  } catch {
    return null;
  }
}

/**
 * Check if a saved route is appropriate for a given user role.
 * Prevents a client from being redirected to /admin routes, etc.
 */
export function isRouteValidForRole(route: string, role: string): boolean {
  const isAdminRoute = route.startsWith("/admin");
  const isPortalRoute = route.startsWith("/portal");
  const isOnboardingRoute = route.startsWith("/onboarding");
  const isDashboardRoute = route.startsWith("/dashboard") || route.startsWith("/kanban");

  switch (role) {
    case "client":
      return isPortalRoute || isOnboardingRoute;

    case "admin":
    case "super_admin":
      // Admins can access everything
      return isAdminRoute || isPortalRoute || isOnboardingRoute || isDashboardRoute;

    case "team_member":
    case "team_lead":
    case "editor":
    case "designer":
      return isAdminRoute || isDashboardRoute;

    case "sales":
      return isAdminRoute || isDashboardRoute;

    case "investor_relations":
      return isAdminRoute;

    default:
      return isPortalRoute;
  }
}

/**
 * Get the best redirect destination after login.
 * Priority: redirectedFrom param > saved route > role default home.
 */
export function getPostLoginRedirect(
  role: string,
  redirectedFrom?: string | null,
  roleHome?: string,
): string {
  // 1. Explicit redirect from URL param (highest priority)
  if (redirectedFrom) {
    return redirectedFrom;
  }

  // 2. SessionStorage saved route (if valid for this role)
  const saved = getSavedRoute(true);
  if (saved && isRouteValidForRole(saved, role)) {
    return saved;
  }

  // 3. Default role home
  return roleHome || "/portal";
}
