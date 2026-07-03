// File Location: src/actions/asset.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { generateAssets } from "@/services/asset.service";

/**
 * Server Action: Trigger visual asset generation for a project.
 */
export async function generateAssetsAction(projectId: string) {
  await generateAssets(projectId);
  revalidatePath(`/projects/${projectId}`);
}
