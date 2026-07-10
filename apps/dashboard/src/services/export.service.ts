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
import fs from "fs";
import path from "path";

/**
 * Trigger the real video export pipeline for a project.
 *
 * Flow:
 * 1. Gather all scene data (voiceover audio, visual asset, subtitle text)
 * 2. For each scene: compose a clip via FFmpeg (image/video + audio + caption)
 * 3. Concatenate all clips into one final MP4
 * 4. Upload final MP4 to Cloudinary
 * 5. Update ExportJob + Video record
 */
export async function triggerExport(
  projectId: string
): Promise<ServiceResult<ExportJob>> {
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

    const scenes = project.script.scenes;

    // 3. Validate that all scenes have required data
    for (const scene of scenes) {
      if (!scene.voiceover?.localPath || !fs.existsSync(scene.voiceover.localPath)) {
        throw new Error(
          `Scene ${scene.sceneIndex + 1} is missing voiceover audio. Generate voiceovers first.`
        );
      }

      if (
        !scene.assets.length ||
        !scene.assets[0].localPath ||
        !fs.existsSync(scene.assets[0].localPath)
      ) {
        throw new Error(
          `Scene ${scene.sceneIndex + 1} is missing visual assets. Generate assets first.`
        );
      }
    }

    // 4. Prepare export directory
    const exportsDir = getExportsDir(projectId);
    const scenePaths: string[] = [];

    // 5. Compose each scene
    for (const scene of scenes) {
      const asset = scene.assets[0];
      const voiceover = scene.voiceover!;

      const sceneOutputPath = path.join(exportsDir, `scene-${scene.sceneIndex}.mp4`);

      await composeScene({
        assetPath: asset.localPath!,
        assetType: asset.type,
        audioPath: voiceover.localPath!,
        subtitles: scene.subtitles.map((s) => ({
          text: s.text,
          startTime: s.startTime || 0,
          endTime: s.endTime || 5,
        })),
        audioDuration: voiceover.duration || scene.duration || 5,
        outputPath: sceneOutputPath,
      });

      scenePaths.push(sceneOutputPath);
    }

    // 6. Concatenate all scenes into final video
    const finalOutputPath = path.join(exportsDir, "final.mp4");
    await concatenateScenes(scenePaths, finalOutputPath);

    // 7. Calculate total duration
    const totalDuration = scenes.reduce(
      (sum, s) => sum + (s.voiceover?.duration || s.duration || 0),
      0
    );

    // 8. Upload final video to Cloudinary
    const uploaded = await uploadVideoToCloudinary(finalOutputPath, projectId);

    // 9. Update ExportJob with Cloudinary URL
    const completedJob = await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "COMPLETED",
        outputUrl: uploaded.secure_url,
        localPath: finalOutputPath,
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