import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const closePopupHtml = (status: string, details?: string) => `
    <html>
      <body>
        <p>Completing authentication...</p>
        <script>
          if (window.opener) {
            window.opener.postMessage(
              { type: "INSTAGRAM_OAUTH", status: "${status}", details: "${details || ""}" },
              window.location.origin
            );
            window.close();
          } else {
            window.location.href = "/portal/account?oauth_status=${status}";
          }
        </script>
      </body>
    </html>
  `;

  // CSRF State Validation
  const cookieStore = await cookies();
  const storedState = cookieStore.get("instagram_oauth_state")?.value;

  // Clear the cookie so it is single-use
  cookieStore.delete("instagram_oauth_state");

  if (!state || !storedState || state !== storedState) {
    return new NextResponse(closePopupHtml("error", "invalid_state"), {
      headers: { "Content-Type": "text/html" },
      status: 403
    });
  }

  if (!code) {
    return new NextResponse(closePopupHtml("error", "missing_code"), {
      headers: { "Content-Type": "text/html" },
      status: 400
    });
  }

  try {
    // Get the user's JWT from the Supabase session cookie
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return new NextResponse(closePopupHtml("error", "not_authenticated"), {
        headers: { "Content-Type": "text/html" },
        status: 401
      });
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
      console.error("Instagram connect failed:", detail);
      return new NextResponse(closePopupHtml("error", "connection_failed"), {
        headers: { "Content-Type": "text/html" }
      });
    }

    return new NextResponse(closePopupHtml("success"), {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    console.error("Instagram callback error:", error);
    return new NextResponse(closePopupHtml("error", "server_error"), {
      headers: { "Content-Type": "text/html" },
      status: 500
    });
  }
}
