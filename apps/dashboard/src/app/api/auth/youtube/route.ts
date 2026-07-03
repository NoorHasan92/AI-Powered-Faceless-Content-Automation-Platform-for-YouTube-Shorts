// File Location: src/app/api/auth/youtube/route.ts
// OAuth2 entry point: redirects user to Google's consent screen.

import { NextResponse } from "next/server";
import { getAuthUrl } from "@/services/youtube.service";

export async function GET() {
  const authUrl = getAuthUrl();
  return NextResponse.redirect(authUrl);
}
