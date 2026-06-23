import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/portal", "/dashboard", "/admin", "/kpi", "/sales", "/onboarding"];

const ROLE_HOMES: Record<string, string> = {
  client: "/portal",
  team_member: "/dashboard",
  team_lead: "/dashboard",
  sales: "/sales",
  admin: "/admin",
  super_admin: "/admin",
  investor_relations: "/admin/reports",
};

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getClientHome(role: string): string {
  return ROLE_HOMES[role] ?? "/portal";
}

function canAccessRoute(role: string, pathname: string): boolean {
  if (role === "admin" || role === "super_admin") return true;
  if (pathname.startsWith("/admin") || pathname.startsWith("/kpi")) {
    return role === "admin" || role === "super_admin" || role === "investor_relations" || role === "team_lead";
  }
  if (pathname.startsWith("/dashboard")) {
    return role === "team_member" || role === "team_lead";
  }
  if (pathname.startsWith("/portal")) {
    return role === "client";
  }
  if (pathname.startsWith("/sales")) {
    return role === "sales";
  }
  return false;
}

function isOnboardingRoute(pathname: string): boolean {
  return pathname.startsWith("/onboarding");
}

const ONBOARDING_STEPS = ["/onboarding/verify", "/onboarding/terms", "/onboarding/payment", "/onboarding/questionnaire", "/onboarding/complete"];

function getOnboardingStepIndex(pathname: string): number {
  return ONBOARDING_STEPS.findIndex((step) => pathname.startsWith(step));
}

export async function middleware(request: NextRequest) {
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

  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute(pathname)) {
    const role = user.user_metadata?.role ?? "client";
    if (!canAccessRoute(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = getClientHome(role);
      return NextResponse.redirect(url);
    }

    if (isOnboardingRoute(pathname) && role === "client") {
      const stepIndex = getOnboardingStepIndex(pathname);
      const emailVerified = !!user.email_confirmed_at;

      if (!emailVerified && stepIndex > 0) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding/verify";
        return NextResponse.redirect(url);
      }

      if (stepIndex > 1 && !emailVerified) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding/verify";
        return NextResponse.redirect(url);
      }
    }
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const role = user.user_metadata?.role ?? "client";
    const url = request.nextUrl.clone();
    url.pathname = getClientHome(role);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
