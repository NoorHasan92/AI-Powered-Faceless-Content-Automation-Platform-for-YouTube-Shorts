// File Location: src/actions/youtube.actions.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { uploadToYouTube } from "@/services/youtube.service";

/**
 * Server Action: Publish an exported video to YouTube.
 * Reads OAuth tokens from HTTP-only cookies.
 */
export async function publishToYouTubeAction(exportJobId: string, projectId: string) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("yt_access_token")?.value;
  const refreshToken = cookieStore.get("yt_refresh_token")?.value;

  if (!accessToken || !refreshToken) {
    return { success: false, error: "Not connected to YouTube. Please connect your account in Settings." };
  }

  const visibility = cookieStore.get("yt_default_visibility")?.value as "public" | "private" | "unlisted" || "private";

  const result = await uploadToYouTube(exportJobId, accessToken, refreshToken, visibility);
  revalidatePath(`/projects/${projectId}`);
  return result;
}

/**
 * Server Action: Set default YouTube publishing visibility.
 */
export async function setYouTubeVisibilityAction(visibility: "public" | "private" | "unlisted") {
  const cookieStore = await cookies();
  cookieStore.set("yt_default_visibility", visibility, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  revalidatePath("/settings");
  return { success: true };
}

/**
 * Server Action: Disconnect YouTube account by clearing cookies.
 */
export async function disconnectYouTubeAction() {
  const cookieStore = await cookies();
  cookieStore.delete("yt_access_token");
  cookieStore.delete("yt_refresh_token");
  revalidatePath("/settings");
  revalidatePath("/analytics");
}
