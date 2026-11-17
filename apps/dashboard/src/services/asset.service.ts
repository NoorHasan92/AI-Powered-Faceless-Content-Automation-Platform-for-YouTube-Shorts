// File Location: src/services/asset.service.ts
// Real visual asset generation using Pexels API and AI image generation.
// Searches for stock videos/images per scene using searchKeywords, downloads them locally.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { Asset, Scene } from "@prisma/client";
import { createClient, type Videos, type Photos, type Video, type Photo, type ErrorResponse } from "pexels";
import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { getAssetsDir } from "@/lib/audio-utils";
import { uploadAssetToCloudinary } from "@/lib/cloudinary-upload";
import { generateImage } from "./image-generation/image-generation.service";
import { ImageGenerationError } from "./image-generation/types";
import { hashString, mulberry32, seededShuffle } from "@/lib/prng";

function getPexelsClient() {
  const apiKey = process.env.PEXELS_API_KEY || "dummy_pexels_key_for_build";
  return createClient(apiKey);
}

/**
 * Download a file from a URL to a local path.
 * Handles both HTTP/HTTPS, redirects (301, 302, 307, 308), and cleans up on error.
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const isHttp = url.startsWith("http://");
    const client = isHttp ? http : https;
    const file = fs.createWriteStream(destPath);

    client.get(url, (response) => {
      // Follow redirects
      if (response.statusCode && [301, 302, 307, 308].includes(response.statusCode)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        }
      }

      if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
        return reject(new Error(`Download failed with HTTP ${response.statusCode} for ${url}`));
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch {}
      reject(err);
    });
  });
}

function isPexelsError(response: Videos | Photos | ErrorResponse): response is ErrorResponse {
  return "error" in response;
}

async function findPexelsAsset(
  searches: { query: string, type: "video" | "image" }[],
  aspectRatio: "16:9" | "9:16" = "9:16"
): Promise<{
  downloadUrl: string;
  sourceUrl: string;
  searchQuery: string;
  type: "STOCK_VIDEO" | "STOCK_IMAGE";
  extension: string;
} | null> {
  const isLandscape = aspectRatio === "16:9";
  const pexelsOrientation = isLandscape ? "landscape" : "portrait";

  for (const search of searches) {
    const { query, type } = search;
    // Anti-repetition: randomly sample among the top 3 result pages
    const randomPage = Math.floor(Math.random() * 3) + 1;

    if (type === "video") {
      try {
        let videoResult = await getPexelsClient().videos.search({
          query,
          per_page: 20,
          page: randomPage,
          orientation: pexelsOrientation,
        });

        // Fallback to page 1 if random page had no videos
        if (isPexelsError(videoResult) || !videoResult.videos || videoResult.videos.length === 0) {
          videoResult = await getPexelsClient().videos.search({
            query,
            per_page: 20,
            page: 1,
            orientation: pexelsOrientation,
          });
        }

        if (!isPexelsError(videoResult) && videoResult.videos.length > 0) {
          const randomIndex = Math.floor(Math.random() * videoResult.videos.length);
          const video = videoResult.videos[randomIndex];

          // Filter files by orientation and resolution bounds
          const orientedFiles = isLandscape
            ? video.video_files.filter(f => f.width && f.height && f.width >= f.height && f.width <= 1920)
            : video.video_files.filter(f => f.width && f.height && f.height >= f.width && f.width <= 1080);

          const candidateFiles = orientedFiles.length > 0
            ? orientedFiles
            : video.video_files.filter(f => f.width && f.width <= (isLandscape ? 1920 : 1080));

          const videoFile = candidateFiles
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
        let photoResult = await getPexelsClient().photos.search({
          query,
          per_page: 20,
          page: randomPage,
          orientation: pexelsOrientation,
        });

        if (isPexelsError(photoResult) || !photoResult.photos || photoResult.photos.length === 0) {
          photoResult = await getPexelsClient().photos.search({
            query,
            per_page: 20,
            page: 1,
            orientation: pexelsOrientation,
          });
        }

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
  "Cinematic establishing shot, wide-angle atmospheric perspective, expansive environmental framing",
  "Extreme close-up macro photography, hyper-detailed textures, shallow depth of field",
  "Low-angle dramatic composition, imposing perspective, heroic framing",
  "Over-the-shoulder documentary framing, intimate perspective, observational style",
  "First-person immersive perspective, subjective viewpoint, experiential framing",
  "Isometric technical visualization, clean geometric composition, architectural clarity",
  "Cinematic tracking composition, dynamic lateral movement implied, parallax depth",
  "Cross-sectional cutaway visualization, revealing internal structure, anatomical perspective",
  "Microscopic perspective, electron microscope aesthetic, false-color scientific imaging",
  "Impossible internal camera, inside-the-subject viewpoint, endoscopic cinematic perspective",
  "Satellite perspective, massive scale, orbital view",
  "Telephoto compression, flattened perspective, intimate scale",
  "Drone aerial shot, sweeping landscape perspective, top-down view",
  "Dutch angle, dynamic tension, tilted horizon",
  "Ultra-wide environmental shot, immersive context, panoramic field of view",
  "Orbital cinematic composition, slow rotational camera, dynamic lighting shift",
  "Slow tracking composition, steady forward movement, revealing depth",
  "Interior anatomical perspective, organic macro photography",
  "Microscopic molecular scale, atomic visualization, quantum probability clouds"
];

/**
 * Attempt AI image generation for a scene.
 * Simple: try once, succeed or fallback to STOCK_VIDEO (motion).
 * No circuit breaker. No retry loop. No payment handling.
 */
async function attemptAIImageGeneration(
  scene: Scene,
  aspectRatio: "16:9" | "9:16" = "9:16"
): Promise<{
  finalAssetData: any[] | null;
  newAssetType: string;
  downgradeReason: string | null;
}> {
  if (scene.visualSource !== "AI_IMAGE") {
    return { finalAssetData: null, newAssetType: scene.visualSource, downgradeReason: null };
  }

  const isLandscape = aspectRatio === "16:9";
  const orientation = isLandscape ? "landscape" : "portrait";

  try {
    const duration = scene.duration || 5;
    let imageCount = 1;
    if (duration > 15) imageCount = 4;
    else if (duration >= 10) imageCount = 3;
    else if (duration > 5) imageCount = 2; // Fixed to > 5 instead of >= 5 since <= 5 is 1 image

    const basePrompt = scene.generatedAssetPrompt || scene.visualPrompt;
    console.log(`[AssetService] Generating ${imageCount} AI Image(s) (${orientation}) for scene ${scene.sceneIndex}...`);

    const results = [];
    
    // Create a seeded PRNG for this specific scene so renders remain deterministic
    // Fallback to scene.id if scriptId isn't present, but scriptId + sceneIndex + basePrompt is extremely stable
    const seedString = `${scene.scriptId || scene.id}-${scene.sceneIndex}-${basePrompt}`;
    const random = mulberry32(hashString(seedString));
    
    // Copy and shuffle the camera modifiers for this scene
    const shuffledModifiers = seededShuffle([...CAMERA_MODIFIERS], random);

    for (let i = 0; i < imageCount; i++) {
      let prompt = basePrompt;
      // Image 0 always uses the original "hero" prompt. Variations use the shuffled cameras.
      if (i > 0) {
        // Weave the camera modifier naturally into the prompt instead of crude prepending
        const modifier = shuffledModifiers[(i - 1) % shuffledModifiers.length];
        const cleanBase = basePrompt.replace(/^(cinematic|macro|wide|overhead|low.angle)[^,]*,\s*/i, "");
        prompt = `${modifier} — ${cleanBase}`;
      }
      if (imageCount > 1) console.log(`[AssetService] Generating variation ${i + 1}/${imageCount}...`);
      const result = await generateImage(prompt, orientation);
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
    // Determine granular downgrade reason from typed error
    let downgradeReason = "IMAGE_GENERATION_FAILED";
    if (err instanceof ImageGenerationError) {
      downgradeReason = err.code;
      console.warn(
        `[AssetService] AI Image generation failed for scene ${scene.sceneIndex}:`,
        `code=${err.code}`,
        `status=${err.httpStatus || 'N/A'}`,
        `message=${err.message}`
      );
      if (err.responseBody) {
        console.warn(`[AssetService] Response body: ${err.responseBody.slice(0, 500)}`);
      }
    } else {
      console.warn(
        `[AssetService] AI Image generation failed for scene ${scene.sceneIndex}:`,
        err?.message || String(err)
      );
    }

    // On ANY failure, fall back to STOCK_VIDEO (motion), never STOCK_IMAGE (still)
    await prisma.scene.update({
      where: { id: scene.id },
      data: {
        visualSource: "STOCK_VIDEO",
        motionTreatment: "LOOP_VIDEO",
        routingDowngradeReason: downgradeReason as any,
      },
    });

    return {
      finalAssetData: null,
      newAssetType: "STOCK_VIDEO",
      downgradeReason,
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
    
    const projectAspectRatio = (script.project.aspectRatio as "16:9" | "9:16") || 
      (script.project.videoFormat === "LONG_FORM" ? "16:9" : "9:16");
    const preferredMotionRatio = script.project.preferredMotionRatio || 0.7;

    for (const scene of script.scenes.sort((a, b) => a.sceneIndex - b.sceneIndex)) {
      // 1. Try AI Image if requested
      const aiResult = await attemptAIImageGeneration(scene, projectAspectRatio);
      
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

        let pexelsAsset = await findPexelsAsset(searches, projectAspectRatio);
        
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

      // 3. Fallback to ambient/atmospheric stock video loop (avoids ugly text placeholders)
      if (finalAssetsData.length === 0) {
        const ambientSearches = [
          { query: `${script.project.niche} atmosphere`, type: "video" as const },
          { query: "dark cinematic background", type: "video" as const },
          { query: "abstract ambient motion", type: "video" as const },
          { query: "cinematic landscape", type: "video" as const },
        ];
        const ambientAsset = await findPexelsAsset(ambientSearches, projectAspectRatio);
        if (ambientAsset) {
          finalAssetsData = [ambientAsset];
        }
      }

      // 4. Fallback to generating a high-quality AI visual if stock couldn't find anything
      if (finalAssetsData.length === 0) {
        try {
          console.log(`[AssetService] Attempting emergency AI image generation for scene ${scene.sceneIndex}...`);
          const emergencyPrompt = scene.generatedAssetPrompt || scene.visualPrompt ||
            `Cinematic documentary scene about ${scene.onScreenCaption || script.project.niche}, dramatic lighting, 8k resolution, atmospheric`;
          const orientation = projectAspectRatio === "16:9" ? "landscape" : "portrait";
          const emergencyImg = await generateImage(emergencyPrompt, orientation);
          finalAssetsData = [{
            buffer: emergencyImg.buffer,
            sourceUrl: "AI_GENERATED_FALLBACK",
            searchQuery: emergencyPrompt,
            type: "AI_IMAGE",
            extension: emergencyImg.extension,
          }];
          await prisma.scene.update({
            where: { id: scene.id },
            data: { visualSource: "AI_IMAGE", motionTreatment: "KEN_BURNS" },
          });
        } catch (imgErr) {
          console.warn(`[AssetService] Emergency AI image generation failed:`, imgErr);
        }
      }

      if (finalAssetsData.length === 0) {
        console.warn(`No visual asset found for scene ${scene.sceneIndex}. Using generic ambient asset.`);
        // Last resort: search generic motion
        const genericAsset = await findPexelsAsset([{ query: "abstract background", type: "video" }], projectAspectRatio);
        if (genericAsset) {
          finalAssetsData = [genericAsset];
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

        // Upload to Cloudinary and use its URL as sourceUrl (with fallback to local URL if upload fails)
        let sourceUrl = `/pipeline/${projectId}/assets/${filename}`;
        try {
          const upload = await uploadAssetToCloudinary(
            localPath,
            projectId,
            scene.sceneIndex,
            finalAssetData.type
          );
          if (upload?.secure_url) {
            sourceUrl = upload.secure_url;
          }
        } catch (uploadErr) {
          console.warn(`[AssetService] Cloudinary asset upload failed for scene ${scene.sceneIndex}, using local asset:`, uploadErr);
        }

        const asset = await prisma.asset.create({
          data: {
            sceneId: scene.id,
            type: finalAssetData.type,
            sourceUrl,
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

                    // Upload rerouted asset to Cloudinary (with fallback to local URL if upload fails)
                    let rerouteUrl = `/pipeline/${projectId}/assets/${filename}`;
                    try {
                      const rerouteUpload = await uploadAssetToCloudinary(
                          localPath,
                          projectId,
                          s.sceneIndex,
                          "STOCK_VIDEO"
                      );
                      if (rerouteUpload?.secure_url) {
                        rerouteUrl = rerouteUpload.secure_url;
                      }
                    } catch (uploadErr) {
                      console.warn(`[AssetService] Cloudinary reroute upload failed for scene ${s.sceneIndex}, using local asset:`, uploadErr);
                    }
                    
                    // Update asset
                    await prisma.asset.update({
                        where: { id: s.assets[0].id },
                        data: { type: "STOCK_VIDEO", sourceUrl: rerouteUrl, localPath, searchQuery: pexelsAsset.searchQuery }
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
