// File Location: src/actions/voiceover.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { generateVoiceovers } from "@/services/voiceover.service";

/**
 * Server Action: Trigger voiceover generation for a project.
 */
export async function generateVoiceoverAction(projectId: string) {
  await generateVoiceovers(projectId);
  revalidatePath(`/projects/${projectId}`);
}
