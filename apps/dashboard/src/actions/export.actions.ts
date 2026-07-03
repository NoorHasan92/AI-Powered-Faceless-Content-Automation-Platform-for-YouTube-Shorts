// File Location: src/actions/export.actions.ts
// Server Actions for the video export pipeline.
// Thin wrapper — delegates to export.service, then revalidates.

"use server";

import { revalidatePath } from "next/cache";
import { triggerExport } from "@/services/export.service";

/**
 * Server Action: Trigger video export/rendering for a project.
 * Called by the "Run Video Composer Agent" button on /projects/[id].
 */
export async function triggerExportAction(projectId: string) {
  await triggerExport(projectId);
  revalidatePath(`/projects/${projectId}`);
}
