// File Location: src/actions/voiceover.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { generateVoiceovers, generateSingleVoiceover } from "@/services/voiceover.service";

/**
 * Server Action: Trigger voiceover generation for a project.
 * Automatically skips scenes that already have audio, unless forceRegenerate is true.
 */
export async function generateVoiceoverAction(projectId: string, forceRegenerate = false): Promise<void> {
  await generateVoiceovers(projectId, forceRegenerate);
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Server Action: Trigger voiceover generation for a single specific scene.
 */
export async function generateSingleVoiceoverAction(projectId: string, sceneId: string) {
  const result = await generateSingleVoiceover(projectId, sceneId);
  revalidatePath(`/projects/${projectId}`);
  return result;
}
