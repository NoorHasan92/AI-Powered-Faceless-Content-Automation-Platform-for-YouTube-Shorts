// File Location: src/services/export.service.ts
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { ExportJob } from "@prisma/client";

/**
 * Trigger the video export pipeline for a project.
 *
 * Phase 1 Placeholder: This creates an ExportJob record and simulates 
 * a rendering delay. In Phase 2+, this will delegate to a real rendering 
 * worker (FFmpeg, Remotion, or a Python media service) via a job queue.
 */
export async function triggerExport(
  projectId: string
): Promise<ServiceResult<ExportJob>> {
  try {
    // 1. Mark project as exporting
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "EXPORTING" },
    });

    // 2. Create the ExportJob record
    const exportJob = await prisma.exportJob.create({
      data: {
        projectId,
        status: "PROCESSING",
        resolution: "1080x1920",
        format: "mp4",
        startedAt: new Date(),
      },
    });

    // 3. Simulate rendering delay (3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. Update the ExportJob to completed with a mock URL
    const completedJob = await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "COMPLETED",
        outputUrl: "https://example.com/mock-rendered-video.mp4",
        duration: 35.5, // mock final duration
        completedAt: new Date(),
      },
    });

    // 5. Mark project as complete
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED" },
    });

    // Note: We deliberately DO NOT create a `Video` record here. 
    // `Video` represents a published asset. The user must manually 
    // click "Publish" (Phase 2) to push the ExportJob to YouTube.

    return { success: true, data: completedJob };
  } catch (error) {
    console.error("Export error:", error);

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}
