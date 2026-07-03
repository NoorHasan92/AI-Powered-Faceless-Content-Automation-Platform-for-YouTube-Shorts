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

  const result = await uploadToYouTube(exportJobId, accessToken, refreshToken);
  revalidatePath(`/projects/${projectId}`);
  return result;
}
