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
  // Admin/super_admin can access everything
  if (ADMIN_ROLES.includes(role)) return true;

  if (pathname.startsWith("/admin") || pathname.startsWith("/kpi")) {
    if (role === "investor_relations") {
      return pathname === "/admin/reports" || pathname.startsWith("/admin/reports");
    }
    return TEAM_ROLES.includes(role) || role === "investor_relations";
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

async function fetchUserProfile(accessToken: string): Promise<{ role: string; account_status: string; onboarding_stage: number } | "network_error" | null> {
  try {
    const apiUrl = getApiUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${apiUrl}/api/v1/auth/me/role`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      if (res.status >= 500) return "network_error"; // MW-05: Don't treat 500 as unauthorized
      return null;
    }
    const data = await res.json();
    return { role: data.role ?? "client", account_status: data.account_status ?? "pending_verification", onboarding_stage: data.onboarding_stage ?? 1 };
  } catch (err: any) {
    // MW-05: Aborts, timeouts, network issues, and JSON parse failures are all network errors, not authorization failures
    return "network_error";
  }
}

function resolveRole(metadataRole: string, backendRole: string | null): string {
  // Database role is single source of truth; if backend returns a valid role, use it
  if (backendRole) return backendRole;
  return metadataRole || "client";
}

export async function proxy(request: NextRequest) {
  // Skip Supabase auth for Instagram OAuth callback (arrives cookieless from Facebook)
  if (request.nextUrl.pathname.startsWith("/api/auth/callback/instagram")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Unauthenticated user trying to access protected route → redirect to login
  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user on a protected route → check role and access
  if (user && isProtectedRoute(pathname)) {
    const metadataRole = (user.user_metadata?.role as string) ?? "client";
    const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
    const profile = accessToken ? await fetchUserProfile(accessToken) : null;
    const isNetworkError = profile === "network_error";

    const role = resolveRole(metadataRole, isNetworkError ? null : (profile?.role ?? null));

    if (!canAccessRoute(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = getHome(role);
      return NextResponse.redirect(url);
    }

    // Portal restriction: non-active clients or those with incomplete onboarding can only access dashboard & support
    let questionnaireSubmitted = false;
    if (role === "client" && !isNetworkError && profile?.account_status === "active") {
      const questionnaireResponse = await fetch(
        `${getApiUrl()}/api/v1/questionnaire/status`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      questionnaireSubmitted = questionnaireResponse.ok;
    }

    const requiresQuestionnaire = pathname.startsWith("/portal/deliverables") || pathname.startsWith("/portal/calendar");
    const portalAccessAllowed = isNetworkError || (profile?.account_status === "active" && (!requiresQuestionnaire || questionnaireSubmitted));
    if (role === "client" && pathname.startsWith("/portal") && !isUnrestrictedPortalRoute(pathname) && !portalAccessAllowed) {
      // The user has paid and is active, allow them to view their payments
      if (pathname.startsWith("/portal/payments") && profile?.account_status === "active") {
        return supabaseResponse;
      }

      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const metadataRole = (user.user_metadata?.role as string) ?? "client";
    const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
    const profile = accessToken ? await fetchUserProfile(accessToken) : null;
    const isNetworkError = profile === "network_error";

    const role = resolveRole(metadataRole, isNetworkError ? null : (profile?.role ?? null));
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
