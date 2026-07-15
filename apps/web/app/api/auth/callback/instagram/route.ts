import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/portal/account?error=missing_code", request.url)
    );
  }

  try {
    // Get the user's JWT from the Supabase session cookie
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.redirect(
        new URL("/portal/account?error=not_authenticated", request.url)
      );
    }

    const redirectUri = `${new URL(request.url).origin}/api/auth/callback/instagram`;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/account/instagram`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Instagram connect failed (${response.status}): ${detail}`);
    }

    return NextResponse.redirect(
      new URL("/portal?success=instagram_connected", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/portal/account?error=connection_failed", request.url)
    );
  }
}
