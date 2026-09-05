import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApiUrl } from "@/lib/api-url";

const ROLE_REDIRECTS: Record<string, string> = {
  client: "/portal",
  team_member: "/dashboard",
  team_lead: "/dashboard",
  sales: "/sales",
  admin: "/admin",
  super_admin: "/admin",
  investor_relations: "/admin/reports",
};

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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // 1. Direct Google OAuth session token returned from backend
  if (token) {
    const claims = parseJwtPayload(token);
    const role = claims?.role || claims?.user_metadata?.role || "client";
    const accountStatus = claims?.account_status || claims?.user_metadata?.account_status || "pending_verification";
    const onboardingStage = claims?.onboarding_stage || claims?.user_metadata?.onboarding_stage || 1;
    const redirectPath = ROLE_REDIRECTS[role] ?? "/portal";

    const response = NextResponse.redirect(`${origin}${redirectPath}`);

    // Set standard cookies recognizable by client and middleware
    response.cookies.set("sb-access-token", token, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
    });
    response.cookies.set("creo_session_token", token, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
    });
    response.cookies.set(
      "creo_role_cache",
      JSON.stringify({
        role,
        account_status: accountStatus,
        onboarding_stage: onboardingStage,
        token_sig: token.slice(-16),
        exp: Date.now() + 15 * 60 * 1000,
      }),
      { path: "/", httpOnly: true, sameSite: "lax", maxAge: 900 }
    );

    return response;
  }

  // 2. Supabase Auth exchange code fallback
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let role = user.user_metadata?.role;
        if (!role) {
          try {
            const session = (await supabase.auth.getSession()).data.session;
            if (session?.access_token) {
              const apiUrl = getApiUrl();
              const res = await fetch(`${apiUrl}/api/v1/auth/me/role`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (res.ok) {
                const roleData = await res.json();
                role = roleData.role;
              }
            }
          } catch {
            // Fallback to client if fetch fails
          }
        }
        role = role ?? "client";
        const redirectPath = ROLE_REDIRECTS[role] ?? "/portal";
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
