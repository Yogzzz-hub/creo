import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/portal/account?error=missing_code", request.url)
    );
  }

try {
    const redirectUri = `${new URL(request.url).origin}/api/auth/callback/instagram`;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/account/instagram`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to connect Instagram account");
    }

    return NextResponse.redirect(
      new URL("/portal/account?success=instagram_connected", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/portal/account?error=connection_failed", request.url)
    );
  }
}
