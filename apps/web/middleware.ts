import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/portal", "/dashboard", "/admin", "/kpi", "/sales", "/onboarding"];

const PUBLIC_ROUTES = ["/forgot-password", "/reset-password"];

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

async function fetchUserRole(accessToken: string): Promise<string | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${apiUrl}/api/v1/auth/me/role`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data.role ?? null;
  } catch {
    return null;
  }
}

function resolveRole(metadataRole: string, backendRole: string | null): string {
  // Database role is single source of truth; if backend returns a valid role, use it
  if (backendRole) return backendRole;
  return metadataRole || "client";
}

export async function middleware(request: NextRequest) {
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
    const backendRole = accessToken ? await fetchUserRole(accessToken) : null;
    const role = resolveRole(metadataRole, backendRole);

    if (!canAccessRoute(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = getHome(role);
      return NextResponse.redirect(url);
    }
  }

  // Authenticated user on login/signup → redirect to their home
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const metadataRole = (user.user_metadata?.role as string) ?? "client";
    const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
    const backendRole = accessToken ? await fetchUserRole(accessToken) : null;
    const role = resolveRole(metadataRole, backendRole);
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
