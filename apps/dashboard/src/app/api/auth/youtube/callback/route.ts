// File Location: src/app/api/auth/youtube/callback/route.ts
// OAuth2 callback handler: exchanges auth code for tokens and stores them in a cookie.

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/services/youtube.service";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No authorization code received" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in HTTP-only cookies (secure, not accessible from client JS)
    const response = NextResponse.redirect(new URL("/settings?youtube=connected", request.url));

    response.cookies.set("yt_access_token", tokens.access_token || "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600, // 1 hour (access tokens expire)
      path: "/",
    });

    if (tokens.refresh_token) {
      response.cookies.set("yt_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/settings?youtube=error", request.url));
  }
}
