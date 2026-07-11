// File Location: src/services/asset.service.ts
// Real visual asset generation using Pexels API and AI image generation.
// Searches for stock videos/images per scene using searchKeywords, downloads them locally.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { Asset, Scene } from "@prisma/client";
import { createClient, type Videos, type Photos, type Video, type Photo, type ErrorResponse } from "pexels";
import fs from "fs";
import path from "path";
import https from "https";
import { getAssetsDir } from "@/lib/audio-utils";
import { uploadAssetToCloudinary } from "@/lib/cloudinary-upload";
import { generateImage } from "./image-generation/image-generation.service";

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

function isPexelsError(response: Videos | Photos | ErrorResponse): response is ErrorResponse {
  return "error" in response;
}

async function findPexelsAsset(searches: { query: string, type: "video" | "image" }[]): Promise<{
  downloadUrl: string;
  sourceUrl: string;
  searchQuery: string;
  type: "STOCK_VIDEO" | "STOCK_IMAGE";
  extension: string;
} | null> {

  for (const search of searches) {
    const { query, type } = search;

    if (type === "video") {
      try {
        const videoResult = await pexelsClient.videos.search({
          query,
          per_page: 15,
          orientation: "portrait",
        });

        if (!isPexelsError(videoResult) && videoResult.videos.length > 0) {
          const randomIndex = Math.floor(Math.random() * videoResult.videos.length);
          const video = videoResult.videos[randomIndex];

          const videoFile = video.video_files
            .filter(f => f.width && f.width <= 1920)
            .sort((a, b) => (b.width || 0) - (a.width || 0))[0] || video.video_files[0];

          if (videoFile?.link) {
            return {
              downloadUrl: videoFile.link,
              sourceUrl: video.url,
              searchQuery: query,
              type: "STOCK_VIDEO",
              extension: "mp4",
            };
          }
        }
      } catch (err) {
        console.warn(`Pexels video search failed for query: ${query}`, err);
      }
    } else if (type === "image") {
      try {
        const photoResult = await pexelsClient.photos.search({
          query,
          per_page: 15,
          orientation: "portrait",
        });

        if (!isPexelsError(photoResult) && photoResult.photos.length > 0) {
          const randomIndex = Math.floor(Math.random() * photoResult.photos.length);
          const photo = photoResult.photos[randomIndex];
          return {
            downloadUrl: photo.src.large2x || photo.src.large,
            sourceUrl: photo.url,
            searchQuery: query,
            type: "STOCK_IMAGE",
            extension: "jpg",
          };
        }
      } catch (err) {
        console.warn(`Pexels image search failed for query: ${query}`, err);
      }
    }
  }

  return null;
}

const CAMERA_MODIFIERS = [
  "Macro close-up, extreme detail",
  "Wide cinematic shot, expansive perspective",
  "Overhead perspective, birds-eye view",
  "Low-angle cinematic, dramatic framing"
];

/**
 * Attempt AI image generation for a scene.
 * Simple: try once, succeed or fallback to STOCK_VIDEO (motion).
 * No circuit breaker. No retry loop. No payment handling.
 */
async function attemptAIImageGeneration(
  scene: Scene
): Promise<{
  finalAssetData: any[] | null;
  newAssetType: string;
  downgradeReason: string | null;
}> {
  if (scene.visualSource !== "AI_IMAGE") {
    return { finalAssetData: null, newAssetType: scene.visualSource, downgradeReason: null };
  }

  try {
    const duration = scene.duration || 5;
    let imageCount = 1;
    if (duration > 15) imageCount = 4;
    else if (duration >= 10) imageCount = 3;
    else if (duration > 5) imageCount = 2; // Fixed to > 5 instead of >= 5 since <= 5 is 1 image

    const basePrompt = scene.generatedAssetPrompt || scene.visualPrompt;
    console.log(`[AssetService] Generating ${imageCount} AI Image(s) for scene ${scene.sceneIndex}...`);

    const results = [];
    for (let i = 0; i < imageCount; i++) {
      let prompt = basePrompt;
      if (imageCount > 1) {
        prompt = `${CAMERA_MODIFIERS[i % CAMERA_MODIFIERS.length]} of ${basePrompt}`;
      }
      if (imageCount > 1) console.log(`[AssetService] Generating variation ${i + 1}/${imageCount}...`);
      const result = await generateImage(prompt, "portrait");
      results.push({
        buffer: result.buffer,
        sourceUrl: "AI_GENERATED",
        searchQuery: prompt,
        type: "AI_IMAGE",
        extension: result.extension,
      });
    }

    return {
      finalAssetData: results,
      newAssetType: "AI_IMAGE",
      downgradeReason: null,
    };
  } catch (err: any) {
    console.warn(
      `[AssetService] AI Image generation failed for scene ${scene.sceneIndex}:`,
      err?.message || String(err)
    );

    // On ANY failure, fall back to STOCK_VIDEO (motion), never STOCK_IMAGE (still)
    await prisma.scene.update({
      where: { id: scene.id },
      data: {
        visualSource: "STOCK_VIDEO",
        motionTreatment: "LOOP_VIDEO",
        routingDowngradeReason: "IMAGE_GENERATION_FAILED",
      },
    });

    return {
      finalAssetData: null,
      newAssetType: "STOCK_VIDEO",
      downgradeReason: "IMAGE_GENERATION_FAILED",
    };
  }
}

export async function generateAssets(projectId: string): Promise<ServiceResult<Asset[]>> {
  try {
    const script = await prisma.script.findUnique({
      where: { projectId },
      include: { scenes: true, project: true },
    });

    if (!script || script.scenes.length === 0) {
      throw new Error("No script or scenes found to generate assets for.");
    }

    const sceneIds = script.scenes.map(s => s.id);
    await prisma.asset.deleteMany({
      where: { sceneId: { in: sceneIds } },
    });

    const assetsDir = getAssetsDir(projectId);
    const assets: Asset[] = [];
    
    const preferredMotionRatio = script.project.preferredMotionRatio || 0.7;

    for (const scene of script.scenes.sort((a, b) => a.sceneIndex - b.sceneIndex)) {
      // 1. Try AI Image if requested
      const aiResult = await attemptAIImageGeneration(scene);
      
      let finalAssetsData: any[] = aiResult.finalAssetData || [];
      let assetTypeToTry = aiResult.newAssetType;
      let downgradeReason = aiResult.downgradeReason;

      // 2. Try Stock if requested or fell back
      if (finalAssetsData.length === 0 && (assetTypeToTry === "STOCK_VIDEO" || assetTypeToTry === "STOCK_IMAGE")) {
        let searches: { query: string, type: "video" | "image" }[] = [];
        if (scene.assetSearches && Array.isArray(scene.assetSearches)) {
          searches = scene.assetSearches as any;
        }

        if (assetTypeToTry === "STOCK_IMAGE") {
          searches.sort((a, b) => (a.type === 'image' ? -1 : 1));
        }

        if (searches.length === 0) {
          const fallbackQuery = scene.searchKeywords.length > 0
            ? scene.searchKeywords.slice(0, 3).join(" ")
            : scene.onScreenCaption;
          if (assetTypeToTry === "STOCK_IMAGE") {
            searches = [{ query: fallbackQuery, type: "image" }, { query: fallbackQuery, type: "video" }];
          } else {
            searches = [{ query: fallbackQuery, type: "video" }, { query: fallbackQuery, type: "image" }];
          }
        }

        let pexelsAsset = await findPexelsAsset(searches);
        
        // If stock video was requested but only found image, mark NO_STOCK_VIDEO_FOUND
        if (assetTypeToTry === "STOCK_VIDEO" && (!pexelsAsset || pexelsAsset.type === "STOCK_IMAGE")) {
            if (!downgradeReason || downgradeReason === "AI_QUOTA") {
                downgradeReason = "NO_STOCK_VIDEO_FOUND";
                await prisma.scene.update({
                  where: { id: scene.id },
                  data: { visualSource: "STOCK_IMAGE", motionTreatment: "KEN_BURNS", routingDowngradeReason: downgradeReason as any }
                });
            }
        }

        if (pexelsAsset) {
          finalAssetsData = [pexelsAsset];
        }
      }

      if (finalAssetsData.length === 0 && assetTypeToTry === "INFOGRAPHIC") {
         // V1 fallback: Infographics require a real visual asset for the FFmpeg pipeline.
         // Generate a placeholder image until a real HTML5/Remotion rendering engine is implemented.
         const title = (scene.infographicPayload as any)?.title || scene.onScreenCaption || "Infographic";
         const encodedTitle = encodeURIComponent(title);
         finalAssetsData = [{
           downloadUrl: `https://placehold.co/1080x1920/1e293b/ffffff/png?text=${encodedTitle}`,
           sourceUrl: "INFOGRAPHIC_GENERATED",
           searchQuery: "infographic",
           type: "INFOGRAPHIC",
           extension: "png"
         }];
      }

      if (finalAssetsData.length === 0) {
        console.warn(`No visual asset found or generated for scene ${scene.sceneIndex}. Generating bulletproof placeholder to prevent export crash...`);
        const fallbackText = encodeURIComponent(`Missing Asset\nScene ${scene.sceneIndex + 1}\nNo Stock Found`);
        finalAssetsData = [{
           downloadUrl: `https://placehold.co/1080x1920/ff4444/ffffff/png?text=${fallbackText}`,
           sourceUrl: "PLACEHOLDER_FAILED",
           searchQuery: "failed",
           type: "STOCK_IMAGE",
           extension: "png"
        }];
        
        // Also update the downgrade reason so it's transparent in the UI
        if (!downgradeReason) {
            await prisma.scene.update({
              where: { id: scene.id },
              data: { routingDowngradeReason: "NO_STOCK_VIDEO_FOUND" }
            });
        }
      }

      for (let i = 0; i < finalAssetsData.length; i++) {
        const finalAssetData = finalAssetsData[i];
        const filename = `scene-${scene.sceneIndex}-${i}.${finalAssetData.extension}`;
        const localPath = path.join(assetsDir, filename);

        if (finalAssetData.buffer) {
          fs.writeFileSync(localPath, finalAssetData.buffer);
        } else if (finalAssetData.downloadUrl) {
          await downloadFile(finalAssetData.downloadUrl, localPath);
        }

        // Upload to Cloudinary and use its URL as sourceUrl
        const upload = await uploadAssetToCloudinary(
          localPath,
          projectId,
          scene.sceneIndex,
          finalAssetData.type
        );

        const asset = await prisma.asset.create({
          data: {
            sceneId: scene.id,
            type: finalAssetData.type,
            sourceUrl: upload.secure_url,
            localPath: localPath,
            searchQuery: finalAssetData.searchQuery,
            status: "COMPLETED",
          },
        });

        assets.push(asset);
      }
    }

    // 5. Final Motion Validation
    // Refetch scenes to get updated DB state
    const finalScenes = await prisma.scene.findMany({ where: { scriptId: script.id }, include: { assets: true } });
    
    let hardMotionScenes = 0;
    let softMotionScenes = 0;
    
    for (const s of finalScenes) {
       const finalType = s.assets[0]?.type || s.visualSource;
       if (finalType === "STOCK_VIDEO" || s.motionTreatment === "INFOGRAPHIC_MOTION") {
           hardMotionScenes++;
       } else if (finalType === "AI_IMAGE" && s.motionTreatment === "KEN_BURNS") {
           softMotionScenes++;
       }
    }
    
    const totalScenes = finalScenes.length;
    const motionRatio = hardMotionScenes / totalScenes;
    
    if (motionRatio < preferredMotionRatio) {
       console.log(`[Motion Validation] Ratio ${motionRatio.toFixed(2)} is below target ${preferredMotionRatio}. Attempting reroute...`);
       // Find non-critical still scenes (STOCK_IMAGE)
       for (const s of finalScenes) {
           const finalType = s.assets[0]?.type || s.visualSource;
           if (finalType === "STOCK_IMAGE") {
               // Reroute to abstract STOCK_VIDEO
               const searches = [
                   { query: s.searchKeywords.join(" ") + " abstract loop", type: "video" as const },
                   { query: "abstract background motion", type: "video" as const }
               ];
               const pexelsAsset = await findPexelsAsset(searches);
                if (pexelsAsset && pexelsAsset.type === "STOCK_VIDEO") {
                    const filename = `scene-${s.sceneIndex}-reroute.mp4`;
                    const localPath = path.join(assetsDir, filename);
                    await downloadFile(pexelsAsset.downloadUrl, localPath);

                    // Upload rerouted asset to Cloudinary
                    const rerouteUpload = await uploadAssetToCloudinary(
                        localPath,
                        projectId,
                        s.sceneIndex,
                        "STOCK_VIDEO"
                    );
                    
                    // Update asset
                    await prisma.asset.update({
                        where: { id: s.assets[0].id },
                        data: { type: "STOCK_VIDEO", sourceUrl: rerouteUpload.secure_url, localPath, searchQuery: pexelsAsset.searchQuery }
                    });
                   
                   // Update scene
                   const dreason = s.routingDowngradeReason || "MOTION_SUBSTITUTION" as any;
                   await prisma.scene.update({
                       where: { id: s.id },
                       data: { visualSource: "STOCK_VIDEO", motionTreatment: "LOOP_VIDEO", routingDowngradeReason: dreason }
                   });
                   hardMotionScenes++;
                   if (hardMotionScenes / totalScenes >= preferredMotionRatio) break;
               }
           }
       }
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
