// File Location: src/actions/script.actions.ts
// Server Actions for script generation mutations.
// Thin wrapper — delegates to script.service, then revalidates.

"use server";

import { revalidatePath } from "next/cache";
import { generateScript } from "@/services/script.service";

/**
 * Server Action: Trigger AI script generation for a project.
 * Called by the "Trigger AI Script Agent" button on /projects/[id].
 */
export async function generateScriptAction(
  projectId: string,
  niche: string,
  tone: string,
  targetDuration: string,
  specificTopic?: string | null,
  creatorInstructions?: string | null
) {
  await generateScript(projectId, niche, tone, targetDuration, specificTopic, creatorInstructions);
  revalidatePath(`/projects/${projectId}`);
}
