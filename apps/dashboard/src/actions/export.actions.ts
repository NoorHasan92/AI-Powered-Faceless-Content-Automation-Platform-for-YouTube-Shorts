// File Location: src/actions/export.actions.ts
// Server Actions for the video export pipeline.
// Thin wrapper — delegates to export.service, then revalidates.

"use server";

import { revalidatePath } from "next/cache";
import { triggerExport } from "@/services/export.service";
import { prisma } from "@/lib/prisma";
import { killActiveJob } from "@/lib/ffmpeg-utils";

/**
 * Server Action: Trigger video export/rendering for a project.
 * Called by the "Run Video Composer Agent" button on /projects/[id].
 */
export async function triggerExportAction(projectId: string) {
  await triggerExport(projectId);
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Server Action: Cancel an in-progress video export compilation.
 * Immediately marks the job as CANCELLED, resets project status, and terminates active FFmpeg processes.
 */
export async function cancelExportAction(jobId: string, projectId: string) {
  try {
    console.log(`[cancelExportAction] Cancelling export job ${jobId} for project ${projectId}...`);

    // 1. Terminate local active FFmpeg process if this node is running it
    killActiveJob(jobId);

    // 2. Mark the export job as CANCELLED in database
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        errorMessage: "Export compilation cancelled by user.",
      },
    });

    // 3. Reset project status back to EXPORT_QUEUED so user can trigger a new export
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "EXPORT_QUEUED" },
    });

    // 4. Notify Render worker endpoint if configured
    if (process.env.RENDER_WORKER_URL) {
      const workerUrl = process.env.RENDER_WORKER_URL.replace(/\/+$/, "");
      const workerSecret = process.env.WORKER_SECRET || "shortforge_secret_tmkc4Z55X69X67";
      fetch(`${workerUrl}/api/jobs/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify({ jobId, projectId }),
      }).catch((err) => {
        console.warn("[cancelExportAction] Failed to notify Render worker:", err);
      });
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    console.error("[cancelExportAction] Failed to cancel export:", err);
    revalidatePath(`/projects/${projectId}`);
    return { success: false, error: err?.message || "Failed to cancel export" };
  }
}
