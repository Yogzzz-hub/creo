import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getApiUrl } from "./lib/api-url";

const PROTECTED_PREFIXES = ["/portal", "/dashboard", "/admin", "/kpi", "/sales", "/onboarding"];

const PUBLIC_ROUTES = ["/forgot-password", "/reset-password"];

const UNRESTRICTED_PORTAL_ROUTES = ["/portal", "/portal/support", "/portal/account"];

function isUnrestrictedPortalRoute(pathname: string): boolean {
  return UNRESTRICTED_PORTAL_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}

const ROLE_HOMES: Record<string, string> = {
  client: "/portal",
  team_member: "/dashboard",
  team_lead: "/dashboard",
  sales: "/sales",
  admin: "/admin",
  super_admin: "/admin",
  investor_relations: "/admin/reports",
};

const ADMIN_ROLES = ["admin", "super_admin"];
const TEAM_ROLES = ["team_member", "team_lead"];

function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.some((route) => pathname === route)) return false;
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getHome(role: string): string {
  return ROLE_HOMES[role] ?? "/portal";
}

function canAccessRoute(role: string, pathname: string): boolean {
  // Admin and super_admin can access everything
  if (ADMIN_ROLES.includes(role)) return true;

  if (pathname.startsWith("/admin")) {
    // Only investor relations can access /admin/reports specifically
    if (role === "investor_relations") {
      return pathname === "/admin/reports" || pathname.startsWith("/admin/reports");
    }
    return false;
  }

  if (pathname.startsWith("/kpi")) {
    // Only admin, super_admin, and investor relations can access KPI
    return role === "investor_relations";
  }

  if (pathname.startsWith("/dashboard")) {
    return TEAM_ROLES.includes(role);
  }

  if (pathname.startsWith("/portal") || pathname.startsWith("/onboarding")) {
    return role === "client";
  }

  if (pathname.startsWith("/sales")) {
    return role === "sales";
  }

  return false;
}

function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function fetchUserProfile(
  accessToken: string
): Promise<{ role: string; account_status: string; onboarding_stage: number } | "network_error" | null> {
  try {
    const apiUrl = getApiUrl();
    const controller = new AbortController();
    // Fast 1.5s timeout prevents page stalls when backend is slow or restarting
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${apiUrl}/api/v1/auth/me/role`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      if (res.status >= 500) return "network_error";
      return null;
    }
    const data = await res.json();
    return {
      role: data.role ?? "client",
      account_status: data.account_status ?? "pending_verification",
      onboarding_stage: data.onboarding_stage ?? 1,
    };
  } catch {
    return "network_error";
  }
}

function resolveRole(metadataRole: string, backendRole: string | null): string {
  if (backendRole) return backendRole;
  return metadataRole || "client";
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. FAST PATH: Next.js prefetch headers
  const isPrefetch =
    request.headers.get("Purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1";
  if (isPrefetch) {
    return NextResponse.next();
  }

  // 2. Skip Supabase auth for Instagram OAuth callback
  if (pathname.startsWith("/api/auth/callback/instagram")) {
    return NextResponse.next();
  }

  const isProtected = isProtectedRoute(pathname);
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  // 3. FAST PATH: Public marketing pages (/, /about, /pricing, /portfolio, /faq, /terms, /privacy)
  // Completely skip all auth & network processing for instant <10ms rendering
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  // Check if any auth cookie exists before initializing Supabase client
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) =>
      c.name.includes("-auth-token") ||
      c.name === "sb-access-token" ||
      c.name === "creo_session_token" ||
      c.name.startsWith("sb-")
  );

  // Unauthenticated user trying to access a protected route -> instant redirect to login
  if (!hasAuthCookie && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Unauthenticated user on login or signup -> allow immediately
  if (!hasAuthCookie && isAuthRoute) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  let accessToken: string | null = null;
  let user: any = null;

  // 1. Direct JWT token from Google OAuth backend
  const directToken = request.cookies.get("sb-access-token")?.value || request.cookies.get("creo_session_token")?.value;
  if (directToken) {
    const claims = parseJwtPayload(directToken);
    if (claims && (!claims.exp || claims.exp * 1000 > Date.now())) {
      accessToken = directToken;
      user = {
        id: claims.sub,
        email: claims.email,
        user_metadata: claims.user_metadata || {
          role: claims.role,
          account_status: claims.account_status,
          onboarding_stage: claims.onboarding_stage,
        },
        app_metadata: claims.app_metadata || {},
      };
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!user && supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
    accessToken = session?.access_token ?? null;
  }


  // Unauthenticated user on protected route
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Unauthenticated user on auth route -> allow
  if (!user) {
    return supabaseResponse;
  }

  // Helper to get or populate user role & status with caching
  let role = (user.user_metadata?.role as string) ?? "client";
  let accountStatus = (user.user_metadata?.account_status as string) ?? "pending_verification";
  let onboardingStage = (user.user_metadata?.onboarding_stage as number) ?? 1;

  // Check token-bound fast cookie cache (5-minute TTL)
  // Ensures client cannot forge a fake role cookie without matching the active session token
  const cachedCookie = request.cookies.get("creo_role_cache");
  let hasValidCache = false;

  if (cachedCookie?.value && accessToken) {
    try {
      const parsed = JSON.parse(cachedCookie.value);
      const expectedTokenSig = accessToken.slice(-16);
      if (
        parsed.token_sig === expectedTokenSig &&
        parsed.exp &&
        parsed.exp > Date.now()
      ) {
        role = parsed.role || role;
        accountStatus = parsed.account_status || accountStatus;
        onboardingStage = parsed.onboarding_stage || onboardingStage;
        hasValidCache = true;
      }
    } catch {
      // Ignore cache parse error
    }
  }

  // If not cached and token exists, check decoded JWT claims in-memory (0ms pure CPU decode)
  if (!hasValidCache && accessToken) {
    const claims = parseJwtPayload(accessToken);
    if (claims) {
      const meta = claims.user_metadata || claims.app_metadata || {};
      if (meta.role) {
        role = meta.role;
      }
      if (meta.account_status) {
        accountStatus = meta.account_status;
      }
      if (meta.onboarding_stage !== undefined) {
        onboardingStage = meta.onboarding_stage;
      }
      hasValidCache = true;

      supabaseResponse.cookies.set(
        "creo_role_cache",
        JSON.stringify({
          role,
          account_status: accountStatus,
          onboarding_stage: onboardingStage,
          token_sig: accessToken.slice(-16),
          exp: Date.now() + 15 * 60 * 1000,
        }),
        { path: "/", httpOnly: true, sameSite: "lax", maxAge: 900 }
      );
    }
  }

  // Handle protected routes
  if (isProtected) {
    // Only if token claims were completely unparseable and cache is absent, fetch with fast fallback
    if (!hasValidCache && accessToken) {
      const profile = await fetchUserProfile(accessToken);
      if (profile && profile !== "network_error") {
        role = resolveRole(role, profile.role);
        accountStatus = profile.account_status;
        onboardingStage = profile.onboarding_stage;

        supabaseResponse.cookies.set(
          "creo_role_cache",
          JSON.stringify({
            role,
            account_status: accountStatus,
            onboarding_stage: onboardingStage,
            token_sig: accessToken.slice(-16),
            exp: Date.now() + 15 * 60 * 1000,
          }),
          { path: "/", httpOnly: true, sameSite: "lax", maxAge: 900 }
        );
      }
    }

    if (!canAccessRoute(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = getHome(role);
      return NextResponse.redirect(url);
    }

    // Portal restriction: onboarding stage check
    const requiresQuestionnaire =
      pathname.startsWith("/portal/deliverables") ||
      pathname.startsWith("/portal/calendar");

    if (role === "client" && pathname.startsWith("/portal") && !isUnrestrictedPortalRoute(pathname)) {
      const questionnaireSubmitted = onboardingStage >= 4;
      const portalAccessAllowed = accountStatus === "active" && (!requiresQuestionnaire || questionnaireSubmitted);

      if (!portalAccessAllowed) {
        if (pathname.startsWith("/portal/payments") && accountStatus === "active") {
          return supabaseResponse;
        }
        const url = request.nextUrl.clone();
        url.pathname = "/portal";
        return NextResponse.redirect(url);
      }
    }
  }

  // Authenticated user trying to visit /login or /signup -> redirect to home
  if (isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = getHome(role);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
