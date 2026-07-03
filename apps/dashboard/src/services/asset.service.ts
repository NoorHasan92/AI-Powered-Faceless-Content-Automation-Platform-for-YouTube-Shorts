// File Location: src/services/asset.service.ts
// Real visual asset generation using Pexels API.
// Searches for stock videos/images per scene using searchKeywords, downloads them locally.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { Asset } from "@prisma/client";
import { createClient, type Videos, type Photos, type Video, type Photo, type ErrorResponse } from "pexels";
import fs from "fs";
import path from "path";
import https from "https";
import { getAssetsDir, toPublicUrl } from "@/lib/audio-utils";

const pexelsClient = createClient(process.env.PEXELS_API_KEY || "");

/**
 * Download a file from a URL to a local path.
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        }
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/**
 * Type guard to check if a Pexels response is an error.
 */
function isPexelsError(response: Videos | Photos | ErrorResponse): response is ErrorResponse {
  return "error" in response;
}

/**
 * Search Pexels for a video matching the keywords. Falls back to image if no video found.
 * Returns the download URL, type, and Pexels source URL.
 */
async function findPexelsAsset(keywords: string[]): Promise<{
  downloadUrl: string;
  sourceUrl: string;
  type: "STOCK_VIDEO" | "STOCK_IMAGE";
  extension: string;
} | null> {
  const query = keywords.slice(0, 3).join(" ");

  // Try video search first (portrait orientation for Shorts)
  try {
    const videoResult = await pexelsClient.videos.search({
      query,
      per_page: 3,
      orientation: "portrait",
    });

    if (!isPexelsError(videoResult) && videoResult.videos.length > 0) {
      const video = videoResult.videos[0];
      // Find the best quality file that's reasonable size (HD, not 4K)
      const videoFile = video.video_files
        .filter(f => f.width && f.width <= 1920)
        .sort((a, b) => (b.width || 0) - (a.width || 0))[0] || video.video_files[0];

      if (videoFile?.link) {
        return {
          downloadUrl: videoFile.link,
          sourceUrl: video.url,
          type: "STOCK_VIDEO",
          extension: "mp4",
        };
      }
    }
  } catch (err) {
    console.warn("Pexels video search failed, falling back to images:", err);
  }

  // Fallback: image search
  try {
    const photoResult = await pexelsClient.photos.search({
      query,
      per_page: 3,
      orientation: "portrait",
    });

    if (!isPexelsError(photoResult) && photoResult.photos.length > 0) {
      const photo = photoResult.photos[0];
      return {
        downloadUrl: photo.src.large2x || photo.src.large,
        sourceUrl: photo.url,
        type: "STOCK_IMAGE",
        extension: "jpg",
      };
    }
  } catch (err) {
    console.warn("Pexels image search also failed:", err);
  }

  return null;
}

/**
 * Generate real visual assets for all scenes in a project.
 *
 * Flow:
 * 1. Fetch script + scenes from DB
 * 2. Clear any existing asset records (retry support)
 * 3. For each scene: search Pexels → download file → create Asset record
 */
export async function generateAssets(projectId: string): Promise<ServiceResult<Asset[]>> {
  try {
    // 1. Get the script and scenes
    const script = await prisma.script.findUnique({
      where: { projectId },
      include: { scenes: true },
    });

    if (!script || script.scenes.length === 0) {
      throw new Error("No script or scenes found to generate assets for.");
    }

    // 2. Clear existing assets for this project's scenes (retry support)
    const sceneIds = script.scenes.map(s => s.id);
    await prisma.asset.deleteMany({
      where: { sceneId: { in: sceneIds } },
    });

    // 3. Prepare output directory
    const assetsDir = getAssetsDir(projectId);

    // 4. Search and download assets for each scene
    const assets: Asset[] = [];

    for (const scene of script.scenes.sort((a, b) => a.sceneIndex - b.sceneIndex)) {
      const keywords = scene.searchKeywords.length > 0
        ? scene.searchKeywords
        : [scene.onScreenCaption]; // fallback if no keywords

      const pexelsAsset = await findPexelsAsset(keywords);

      if (!pexelsAsset) {
        console.warn(`No Pexels asset found for scene ${scene.sceneIndex}, keywords: ${keywords}`);
        // Create a placeholder asset record with FAILED status
        const failedAsset = await prisma.asset.create({
          data: {
            sceneId: scene.id,
            type: "STOCK_IMAGE",
            sourceUrl: "",
            status: "FAILED",
          },
        });
        assets.push(failedAsset);
        continue;
      }

      // Download the file
      const filename = `scene-${scene.sceneIndex}.${pexelsAsset.extension}`;
      const localPath = path.join(assetsDir, filename);

      await downloadFile(pexelsAsset.downloadUrl, localPath);

      // Create Asset record
      const asset = await prisma.asset.create({
        data: {
          sceneId: scene.id,
          type: pexelsAsset.type,
          sourceUrl: pexelsAsset.sourceUrl,
          localPath,
          status: "COMPLETED",
        },
      });

      assets.push(asset);
    }

    return { success: true, data: assets };
  } catch (error) {
    console.error("Asset generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate assets",
    };
  }
}
