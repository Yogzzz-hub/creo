import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ROLE_REDIRECTS: Record<string, string> = {
  client: "/portal",
  team_member: "/dashboard",
  team_lead: "/dashboard",
  sales: "/sales",
  admin: "/admin",
  super_admin: "/admin",
  investor_relations: "/admin/reports",
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
