import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getBaseUrl } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = crypto.randomUUID();

    // Set cookie
    const isProduction = process.env.NODE_ENV === "production";
    cookieStore.set("instagram_oauth_state", state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
    const redirectUri = `${getBaseUrl()}/api/auth/callback/instagram`;
    const scopes = [
      "instagram_basic",
      "instagram_content_publish"
    ];

    const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=${scopes.join(",")}&response_type=code`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to generate Instagram URL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
