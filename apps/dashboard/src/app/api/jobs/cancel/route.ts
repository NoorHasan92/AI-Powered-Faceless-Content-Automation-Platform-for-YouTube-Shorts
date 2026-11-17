// File Location: src/app/api/jobs/cancel/route.ts
// Cancels an active export job on the Render worker and terminates active FFmpeg processes.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { killActiveJob } from "@/lib/ffmpeg-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.WORKER_SECRET || "shortforge_secret_tmkc4Z55X69X67";
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, projectId } = body;

    if (!jobId && !projectId) {
      return NextResponse.json({ error: "jobId or projectId is required" }, { status: 400 });
    }

    console.log(`[RenderWorker] Cancel requested for job: ${jobId}, project: ${projectId}`);

    // Kill any active FFmpeg child process
    if (jobId) {
      killActiveJob(jobId);
    }

    // Update job status in database to CANCELLED
    if (jobId) {
      await prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: "CANCELLED",
          errorMessage: "Export compilation cancelled by user.",
        },
      }).catch((e) => console.warn("[CancelRoute] Could not update exportJob:", e));
    }

    // Reset project status back to EXPORT_QUEUED
    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "EXPORT_QUEUED" },
      }).catch((e) => console.warn("[CancelRoute] Could not update project:", e));
    }

    return NextResponse.json({
      success: true,
      message: "Export compilation cancelled successfully",
      jobId,
      projectId,
    });
  } catch (err: any) {
    console.error("[RenderWorker] Error in cancel endpoint:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to cancel export job" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
