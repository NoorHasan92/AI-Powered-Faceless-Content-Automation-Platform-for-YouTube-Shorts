// File Location: src/actions/asset.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { generateAssets } from "@/services/asset.service";

/**
 * Server Action: Trigger visual asset generation for a project.
 */
export async function generateAssetsAction(projectId: string) {
  const res = await generateAssets(projectId);
  if (!res.success) {
    throw new Error(res.error || "Failed to generate assets");
  }
  revalidatePath(`/projects/${projectId}`);
}
