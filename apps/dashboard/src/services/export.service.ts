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

/**
 * Ensures media file is available locally on disk.
 * If localPath exists on this server, uses it.
 * Otherwise falls back to downloading remoteUrl (Cloudinary, Pexels, etc.) into destPath.
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
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
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
  projectId: string
): Promise<ServiceResult<ExportJob>> {
  // Delegate to Render worker if configured on Vercel
  if (process.env.RENDER_WORKER_URL && !process.env.IS_RENDER_WORKER) {
    const workerUrl = process.env.RENDER_WORKER_URL.replace(/\/+$/, "");
    const workerSecret = process.env.WORKER_SECRET || "shortforge_secret_tmkc4Z55X69X67";
    console.log(`[ExportService] Delegating export job to Render worker at ${workerUrl}...`);

    const exportJob = await prisma.exportJob.create({
      data: {
        projectId,
        status: "PROCESSING",
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
        body: JSON.stringify({ projectId }),
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

  // Create the ExportJob record first so UI can show "PROCESSING"
  const exportJob = await prisma.exportJob.create({
    data: {
      projectId,
      status: "PROCESSING",
      resolution: "1080x1920",
      format: "mp4",
      startedAt: new Date(),
    },
  });

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

    // 3. Prepare export directory
    const exportsDir = getExportsDir(projectId);
    const scenePaths: string[] = [];

    // 4. Validate and resolve all scene media (locally or from Cloudinary)
    for (const scene of scenes) {
      if (!scene.voiceover) {
        throw new Error(
          `Scene ${scene.sceneIndex + 1} is missing voiceover audio. Generate voiceovers first.`
        );
      }
      const audioTarget = path.join(exportsDir, `audio-scene-${scene.sceneIndex}.mp3`);
      scene.voiceover.localPath = await ensureMediaFile(
        scene.voiceover.localPath,
        scene.voiceover.audioUrl,
        audioTarget
      );

      if (!scene.assets.length) {
        throw new Error(
          `Scene ${scene.sceneIndex + 1} is missing visual assets. Generate assets first.`
        );
      }

      for (let i = 0; i < scene.assets.length; i++) {
        const asset = scene.assets[i];
        const ext = asset.type === "STOCK_VIDEO" ? "mp4" : "jpg";
        const assetTarget = path.join(exportsDir, `asset-scene-${scene.sceneIndex}-${i}.${ext}`);
        asset.localPath = await ensureMediaFile(
          asset.localPath,
          asset.sourceUrl,
          assetTarget
        );
      }
    }

    // 5. Compose each scene
    for (const scene of scenes) {
      const voiceover = scene.voiceover!;

      const sceneOutputPath = path.join(exportsDir, `scene-${scene.sceneIndex}.mp4`);

      await composeScene({
        assetPaths: scene.assets.map(a => a.localPath!),
        assetType: scene.assets[0].type,
        audioPath: voiceover.localPath!,
        subtitles: scene.subtitles.map((s) => ({
          text: s.text,
          startTime: s.startTime || 0,
          endTime: s.endTime || 5,
        })),
        audioDuration: voiceover.duration || scene.duration || 5,
        outputPath: sceneOutputPath,
        aspectRatio,
      });

      scenePaths.push(sceneOutputPath);
    }

    // 6. Calculate total duration
    const totalDuration = scenes.reduce(
      (sum, s) => sum + (s.voiceover?.duration || s.duration || 0),
      0
    );

    // 7. Concatenate all scenes into final video with background music
    const bgmPath = getBgmFilePath(project.bgmTrack);
    const finalOutputPath = path.join(exportsDir, "final.mp4");
    await concatenateScenes(scenePaths, finalOutputPath, bgmPath, totalDuration);

    // 8. Upload final video to Cloudinary (with fallback to local URL if size exceeds 100MB free limit)
    let outputUrl = `/pipeline/${projectId}/exports/final.mp4`;
    try {
      const uploaded = await uploadVideoToCloudinary(finalOutputPath, projectId);
      if (uploaded?.secure_url) {
        outputUrl = uploaded.secure_url;
      }
    } catch (uploadErr) {
      console.warn(`[ExportService] Cloudinary video upload encountered an issue (e.g. file size limit), using local export URL:`, uploadErr);
    }

    // 9. Update ExportJob
    const completedJob = await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "COMPLETED",
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

    // Update export job as failed
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

    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}