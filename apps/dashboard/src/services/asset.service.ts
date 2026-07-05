// File Location: src/services/asset.service.ts
// Real visual asset generation using Pexels API.
// Searches for stock videos/images per scene using searchKeywords, downloads them locally.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { Asset, Scene } from "@prisma/client";
import { createClient, type Videos, type Photos, type Video, type Photo, type ErrorResponse } from "pexels";
import fs from "fs";
import path from "path";
import https from "https";
import { getAssetsDir, toPublicUrl } from "@/lib/audio-utils";
import { generateImage } from "./ai/image-generation.service";

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

async function attemptAIGenerationWithCircuitBreaker(
  scene: Scene, 
  projectId: string, 
  aiImageFallbackDisabled: boolean
): Promise<{ 
  finalAssetData: any | null, 
  newAssetType: any, 
  newDowngradeReason: any, 
  fallbackDisabled: boolean 
}> {
  let assetTypeToTry = scene.visualSource;
  let downgradeReason = scene.routingDowngradeReason;
  let fallbackDisabled = aiImageFallbackDisabled;
  let finalAssetData = null;

  if (assetTypeToTry === "AI_IMAGE" && fallbackDisabled) {
    console.warn(`Skipping AI Image for scene ${scene.sceneIndex} due to previous 402/Disabled flag.`);
    assetTypeToTry = "STOCK_VIDEO";
    if (!downgradeReason) downgradeReason = "AI_DISABLED_FOR_PROJECT" as any;
    
    await prisma.scene.update({
      where: { id: scene.id },
      data: { visualSource: "STOCK_VIDEO", motionTreatment: "LOOP_VIDEO", routingDowngradeReason: downgradeReason }
    });
    return { finalAssetData: null, newAssetType: assetTypeToTry, newDowngradeReason: downgradeReason, fallbackDisabled };
  }

  if (assetTypeToTry === "AI_IMAGE") {
    let retries = 0;
    let success = false;
    while (retries < 2 && !success) {
      try {
        const prompt = scene.generatedAssetPrompt || scene.visualPrompt;
        console.log(`Generating AI Image for scene ${scene.sceneIndex}... (attempt ${retries + 1})`);
        const result = await generateImage(prompt, "portrait");
        finalAssetData = {
          downloadUrl: result.url,
          buffer: result.buffer,
          sourceUrl: "AI_GENERATED",
          searchQuery: prompt,
          type: "AI_IMAGE",
          extension: result.extension
        };
        success = true;
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.warn(`AI Image generation failed for scene ${scene.sceneIndex}:`, errMsg);
        
        if (errMsg.includes("402") || errMsg.toLowerCase().includes("payment") || errMsg.toLowerCase().includes("credit")) {
          fallbackDisabled = true;
          await prisma.project.update({ where: { id: projectId }, data: { aiImageFallbackDisabled: true }});
          assetTypeToTry = "STOCK_VIDEO";
          if (!downgradeReason) downgradeReason = "REPLICATE_402" as any;
          await prisma.scene.update({
            where: { id: scene.id },
            data: { visualSource: "STOCK_VIDEO", motionTreatment: "LOOP_VIDEO", routingDowngradeReason: downgradeReason }
          });
          break; // Stop retrying
        } else if (errMsg.includes("429") || errMsg.toLowerCase().includes("too many requests")) {
          retries++;
          if (retries >= 2) {
            assetTypeToTry = "STOCK_VIDEO";
            // 402 > 429 > others. Check priority.
            if (!downgradeReason || downgradeReason === "AI_QUOTA" || downgradeReason === "MOTION_SUBSTITUTION") {
               downgradeReason = "REPLICATE_429" as any;
            }
            await prisma.scene.update({
              where: { id: scene.id },
              data: { visualSource: "STOCK_VIDEO", motionTreatment: "LOOP_VIDEO", routingDowngradeReason: downgradeReason }
            });
          } else {
             // wait 2 seconds before retry
             await new Promise(r => setTimeout(r, 2000));
          }
        } else {
          assetTypeToTry = "STOCK_IMAGE";
          break; // Other error, fallback to stock image
        }
      }
    }
  }

  return { finalAssetData, newAssetType: assetTypeToTry, newDowngradeReason: downgradeReason, fallbackDisabled };
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
    
    let fallbackDisabled = script.project.aiImageFallbackDisabled;
    const preferredMotionRatio = script.project.preferredMotionRatio || 0.7;

    for (const scene of script.scenes.sort((a, b) => a.sceneIndex - b.sceneIndex)) {
      // 1. Try AI Image if requested (with circuit breaker)
      const aiResult = await attemptAIGenerationWithCircuitBreaker(scene, projectId, fallbackDisabled);
      fallbackDisabled = aiResult.fallbackDisabled;
      
      let finalAssetData = aiResult.finalAssetData;
      let assetTypeToTry = aiResult.newAssetType;
      let downgradeReason = aiResult.newDowngradeReason;

      // 2. Try Stock if requested or fell back
      if (!finalAssetData && (assetTypeToTry === "STOCK_VIDEO" || assetTypeToTry === "STOCK_IMAGE")) {
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
                downgradeReason = "NO_STOCK_VIDEO_FOUND" as any;
                await prisma.scene.update({
                  where: { id: scene.id },
                  data: { visualSource: "STOCK_IMAGE", motionTreatment: "KEN_BURNS", routingDowngradeReason: downgradeReason }
                });
            }
        }

        if (pexelsAsset) {
          finalAssetData = pexelsAsset;
        }
      }

      if (!finalAssetData && assetTypeToTry === "INFOGRAPHIC") {
         // V1 fallback: Infographics require a real visual asset for the FFmpeg pipeline.
         // Generate a placeholder image until a real HTML5/Remotion rendering engine is implemented.
         const title = (scene.infographicPayload as any)?.title || scene.onScreenCaption || "Infographic";
         const encodedTitle = encodeURIComponent(title);
         finalAssetData = {
           downloadUrl: `https://placehold.co/1080x1920/1e293b/ffffff/png?text=${encodedTitle}`,
           sourceUrl: "INFOGRAPHIC_GENERATED",
           searchQuery: "infographic",
           type: "INFOGRAPHIC",
           extension: "png"
         };
      }

      if (!finalAssetData) {
        console.warn(`No visual asset found or generated for scene ${scene.sceneIndex}. Generating bulletproof placeholder to prevent export crash...`);
        const fallbackText = encodeURIComponent(`Missing Asset\nScene ${scene.sceneIndex + 1}\nNo Stock Found`);
        finalAssetData = {
           downloadUrl: `https://placehold.co/1080x1920/ff4444/ffffff/png?text=${fallbackText}`,
           sourceUrl: "PLACEHOLDER_FAILED",
           searchQuery: "failed",
           type: "STOCK_IMAGE",
           extension: "png"
        };
        
        // Also update the downgrade reason so it's transparent in the UI
        if (!downgradeReason) {
            await prisma.scene.update({
              where: { id: scene.id },
              data: { routingDowngradeReason: "NO_STOCK_VIDEO_FOUND" }
            });
        }
      }

      const filename = `scene-${scene.sceneIndex}.${finalAssetData.extension}`;
      const localPath = path.join(assetsDir, filename);

      if (finalAssetData.buffer) {
        fs.writeFileSync(localPath, finalAssetData.buffer);
      } else if (finalAssetData.downloadUrl) {
        await downloadFile(finalAssetData.downloadUrl, localPath);
      }

      const asset = await prisma.asset.create({
        data: {
          sceneId: scene.id,
          type: finalAssetData.type,
          sourceUrl: finalAssetData.sourceUrl,
          localPath: finalAssetData.downloadUrl ? localPath : null,
          searchQuery: finalAssetData.searchQuery,
          status: "COMPLETED",
        },
      });

      assets.push(asset);
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
                   
                   // Update asset
                   await prisma.asset.update({
                       where: { id: s.assets[0].id },
                       data: { type: "STOCK_VIDEO", sourceUrl: pexelsAsset.sourceUrl, localPath, searchQuery: pexelsAsset.searchQuery }
                   });
                   
                   // Update scene
                   const downgradeReason = s.routingDowngradeReason || "MOTION_SUBSTITUTION" as any;
                   await prisma.scene.update({
                       where: { id: s.id },
                       data: { visualSource: "STOCK_VIDEO", motionTreatment: "LOOP_VIDEO", routingDowngradeReason: downgradeReason }
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
