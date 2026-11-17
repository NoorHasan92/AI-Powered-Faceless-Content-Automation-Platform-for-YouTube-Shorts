// File Location: src/services/export.service.ts
// Real video export pipeline using FFmpeg.
// Composes scene clips (visual + audio + subtitles), concatenates into a final MP4,
// then uploads the final video to Cloudinary.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { ExportJob } from "@prisma/client";
import { composeScene, concatenateScenes } from "@/lib/ffmpeg-utils";
import { getExportsDir } from "@/lib/audio-utils";
import { uploadVideoToCloudinary } from "@/lib/cloudinary-upload";
import { getBgmFilePath } from "@/services/bgm.service";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

/**
 * Ensures media file is available locally on disk.
 * If localPath exists on this server, uses it.
 * Otherwise falls back to streaming remoteUrl (Cloudinary, Pexels, etc.) into destPath.
 */
async function ensureMediaFile(
  localPath: string | null | undefined,
  remoteUrl: string | null | undefined,
  destPath: string
): Promise<string> {
  if (localPath && fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
    return localPath;
  }
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    return destPath;
  }
  const candidateUrl =
    (remoteUrl && (remoteUrl.startsWith("http://") || remoteUrl.startsWith("https://")))
      ? remoteUrl
      : (localPath && (localPath.startsWith("http://") || localPath.startsWith("https://")))
      ? localPath
      : null;

  if (candidateUrl) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const res = await fetch(candidateUrl);
    if (!res.ok) throw new Error(`Failed to download remote asset from ${candidateUrl}: ${res.statusText}`);
    
    // Stream directly to file on disk to avoid loading multi-megabyte buffers into Node heap
    if (res.body) {
      const fileStream = fs.createWriteStream(destPath);
      await pipeline(Readable.fromWeb(res.body as any), fileStream);
    } else {
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
    }

    if (typeof (global as any).gc === "function") {
      (global as any).gc();
    }
    return destPath;
  }

  throw new Error(`Media file not found locally (${localPath}) and has no valid remote URL (${remoteUrl})`);
}

/**
 * Trigger the real video export pipeline for a project.
 *
 * Flow:
 * 1. If RENDER_WORKER_URL is set (and not currently running on Render worker), delegate to worker.
 * 2. Gather all scene data (voiceover audio, visual asset, subtitle text)
 * 3. Resolve all scene media locally (downloading from Cloudinary if needed)
 * 4. For each scene: compose a clip via FFmpeg (image/video + audio + caption)
 * 5. Concatenate all clips into one final MP4 with continuous BGM
 * 6. Upload final MP4 to Cloudinary
 * 7. Update ExportJob + Project records
 */
export async function triggerExport(
  projectId: string,
  existingJobId?: string
): Promise<ServiceResult<ExportJob>> {
  // Delegate to Render worker if configured on Vercel
  if (process.env.RENDER_WORKER_URL && !process.env.IS_RENDER_WORKER) {
    const workerUrl = process.env.RENDER_WORKER_URL.replace(/\/+$/, "");
    const workerSecret = process.env.WORKER_SECRET || "shortforge_secret_tmkc4Z55X69X67";
    console.log(`[ExportService] Delegating export job to Render worker at ${workerUrl}...`);

    // Clean up any old PROCESSING jobs for this project to eliminate stalled UI duplicates
    await prisma.exportJob.updateMany({
      where: { projectId, status: "PROCESSING" },
      data: { status: "FAILED", errorMessage: "Superseded by new export job" },
    });

    const projectCheck = await prisma.project.findUnique({
      where: { id: projectId },
      include: { script: { include: { scenes: { select: { id: true } } } } },
    });
    const totalScenes = projectCheck?.script?.scenes.length || 0;

    const exportJob = await prisma.exportJob.create({
      data: {
        projectId,
        status: "PROCESSING",
        progress: 0,
        currentScene: 0,
        totalScenes,
        resolution: "1080x1920",
        format: "mp4",
        startedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "EXPORTING" },
    });

    try {
      const res = await fetch(`${workerUrl}/api/jobs/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify({ projectId, jobId: exportJob.id }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Render worker responded with ${res.status}: ${errText}`);
      }

      return { success: true, data: exportJob };
    } catch (err: any) {
      console.error("[ExportService] Failed to delegate export to Render worker:", err);
      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: { status: "FAILED", errorMessage: err?.message || "Render worker dispatch failed" },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "FAILED" },
      });
      return { success: false, error: err?.message || "Failed to dispatch to Render worker" };
    }
  }

  // Use existing ExportJob created by Vercel if passed, or create a fresh one
  let exportJob = existingJobId
    ? await prisma.exportJob.findUnique({ where: { id: existingJobId } })
    : null;

  if (!exportJob) {
    exportJob = await prisma.exportJob.create({
      data: {
        projectId,
        status: "PROCESSING",
        progress: 0,
        currentScene: 0,
        totalScenes: 0,
        resolution: "1080x1920",
        format: "mp4",
        startedAt: new Date(),
      },
    });
  }

  try {
    // 1. Mark project as exporting
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "EXPORTING" },
    });

    // 2. Fetch all pipeline data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        script: {
          include: {
            scenes: {
              include: {
                voiceover: true,
                assets: true,
                subtitles: true,
              },
              orderBy: { sceneIndex: "asc" },
            },
          },
        },
      },
    });

    if (!project?.script?.scenes.length) {
      throw new Error("No script or scenes found for export.");
    }

    const isLandscape = project.aspectRatio === "16:9" || project.videoFormat === "LONG_FORM";
    const aspectRatio: "16:9" | "9:16" = isLandscape ? "16:9" : "9:16";
    const resolution = isLandscape ? "1920x1080" : "1080x1920";

    const scenes = project.script.scenes;
    const totalScenes = scenes.length;

    // Record accurate totalScenes in DB
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: { totalScenes },
    });

    // 3. Prepare export directory
    const exportsDir = getExportsDir(projectId);
    const scenePaths: string[] = [];

    // 4. Compose each scene sequentially with streaming memory release
    for (const scene of scenes) {
      // Periodic cancellation check before starting scene processing
      const currentJob = await prisma.exportJob.findUnique({
        where: { id: exportJob.id },
        select: { status: true },
      });
      if (currentJob?.status === "CANCELLED") {
        console.log(`[ExportService] Job ${exportJob.id} cancelled by user. Halting pipeline.`);
        for (const sp of scenePaths) {
          try { fs.unlinkSync(sp); } catch {}
        }
        return { success: false, error: "Export cancelled by user." };
      }

      // Live progress calculation: scenes cover 0% -> 85%
      const sceneProgress = Math.max(1, Math.round((scene.sceneIndex / totalScenes) * 85));
      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: {
          progress: sceneProgress,
          currentScene: scene.sceneIndex + 1,
          totalScenes,
        },
      });

      if (!scene.voiceover) {
        throw new Error(
          `Scene ${scene.sceneIndex + 1} is missing voiceover audio. Generate voiceovers first.`
        );
      }
      if (!scene.assets.length) {
        throw new Error(
          `Scene ${scene.sceneIndex + 1} is missing visual assets. Generate assets first.`
        );
      }

      const audioTarget = path.join(exportsDir, `audio-scene-${scene.sceneIndex}.mp3`);
      const resolvedAudioPath = await ensureMediaFile(
        scene.voiceover.localPath,
        scene.voiceover.audioUrl,
        audioTarget
      );

      const downloadedAssetFiles: string[] = [];
      const resolvedAssetPaths: string[] = [];

      for (let i = 0; i < scene.assets.length; i++) {
        const asset = scene.assets[i];
        const ext = asset.type === "STOCK_VIDEO" ? "mp4" : "jpg";
        const assetTarget = path.join(exportsDir, `asset-scene-${scene.sceneIndex}-${i}.${ext}`);
        const resolvedPath = await ensureMediaFile(
          asset.localPath,
          asset.sourceUrl,
          assetTarget
        );
        resolvedAssetPaths.push(resolvedPath);
        if (resolvedPath === assetTarget) {
          downloadedAssetFiles.push(assetTarget);
        }
      }

      const sceneOutputPath = path.join(exportsDir, `scene-${scene.sceneIndex}.mp4`);

      console.log(`[ExportService] Composing scene ${scene.sceneIndex + 1}/${totalScenes}...`);

      await composeScene({
        assetPaths: resolvedAssetPaths,
        assetType: scene.assets[0].type,
        audioPath: resolvedAudioPath,
        subtitles: scene.subtitles.map((s) => ({
          text: s.text,
          startTime: s.startTime || 0,
          endTime: s.endTime || 5,
        })),
        audioDuration: scene.voiceover.duration || scene.duration || 5,
        outputPath: sceneOutputPath,
        aspectRatio,
        jobId: exportJob.id,
      });

      scenePaths.push(sceneOutputPath);

      // Clean up raw downloaded scene visuals and audio to keep disk & memory footprint minimal
      for (const rawFile of downloadedAssetFiles) {
        try { fs.unlinkSync(rawFile); } catch {}
      }
      try {
        if (resolvedAudioPath.startsWith(exportsDir)) {
          fs.unlinkSync(resolvedAudioPath);
        }
      } catch {}
      try {
        const assFile = sceneOutputPath.replace(".mp4", ".ass");
        if (fs.existsSync(assFile)) {
          fs.unlinkSync(assFile);
        }
      } catch {}

      // Proactively release memory
      if (typeof (global as any).gc === "function") {
        (global as any).gc();
      }
    }

    // Cancellation check before concatenation
    const jobBeforeConcat = await prisma.exportJob.findUnique({
      where: { id: exportJob.id },
      select: { status: true },
    });
    if (jobBeforeConcat?.status === "CANCELLED") {
      for (const sp of scenePaths) {
        try { fs.unlinkSync(sp); } catch {}
      }
      return { success: false, error: "Export cancelled by user." };
    }

    // Update progress: 88% Concatenating & audio mixing
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        progress: 88,
        currentScene: totalScenes,
        totalScenes,
      },
    });

    // 6. Calculate total duration
    const totalDuration = scenes.reduce(
      (sum, s) => sum + (s.voiceover?.duration || s.duration || 0),
      0
    );

    // 7. Concatenate all scenes into final video with background music
    const bgmPath = getBgmFilePath(project.bgmTrack);
    const finalOutputPath = path.join(exportsDir, "final.mp4");
    await concatenateScenes(scenePaths, finalOutputPath, bgmPath, totalDuration, exportJob.id);

    // Update progress: 95% Uploading to Cloudinary
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: { progress: 95 },
    });

    // 8. Upload final video to Cloudinary (with fallback to local URL if size exceeds limit)
    let outputUrl = `/pipeline/${projectId}/exports/final.mp4`;
    try {
      const uploaded = await uploadVideoToCloudinary(finalOutputPath, projectId);
      if (uploaded?.secure_url) {
        outputUrl = uploaded.secure_url;
      }
    } catch (uploadErr) {
      console.warn(`[ExportService] Cloudinary video upload encountered an issue, using local export URL:`, uploadErr);
    }

    // 9. Update ExportJob as COMPLETED
    const completedJob = await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "COMPLETED",
        progress: 100,
        currentScene: totalScenes,
        totalScenes,
        outputUrl,
        localPath: finalOutputPath,
        resolution,
        duration: parseFloat(totalDuration.toFixed(2)),
        completedAt: new Date(),
      },
    });

    // 10. Mark project as complete
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED" },
    });

    return { success: true, data: completedJob };
  } catch (error) {
    console.error("Export error:", error);

    const checkFinalStatus = await prisma.exportJob.findUnique({
      where: { id: exportJob.id },
      select: { status: true },
    });

    if (checkFinalStatus?.status !== "CANCELLED") {
      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Export failed",
        },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "FAILED" },
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}