// File Location: src/app/api/jobs/export/route.ts
// Background export runner endpoint executed on the Render Worker.

import { NextResponse } from "next/server";
import { triggerExport } from "@/services/export.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    // Optional secret verification to prevent unauthorized export triggers
    const workerSecret = process.env.WORKER_SECRET;
    if (workerSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${workerSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    console.log(`[RenderWorker] Received export job for project: ${projectId}`);

    // Start FFmpeg compositing in background (Render's Node process keeps running)
    // We launch it as an untracked background promise so the caller (Vercel) gets a fast 200 response
    triggerExport(projectId).then((result) => {
      if (result.success) {
        console.log(`[RenderWorker] Successfully completed export for project: ${projectId}`);
      } else {
        console.error(`[RenderWorker] Export failed for project ${projectId}:`, result.error);
      }
    }).catch((err) => {
      console.error(`[RenderWorker] Fatal error in export worker for project ${projectId}:`, err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Export job queued on Render worker",
        projectId,
        startedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    console.error("[RenderWorker] Failed to process export job request:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process export job" },
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
