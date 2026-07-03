// File Location: src/actions/subtitle.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { generateSubtitles } from "@/services/subtitle.service";

/**
 * Server Action: Trigger subtitle generation for a project.
 */
export async function generateSubtitlesAction(projectId: string) {
  await generateSubtitles(projectId);
  revalidatePath(`/projects/${projectId}`);
}
