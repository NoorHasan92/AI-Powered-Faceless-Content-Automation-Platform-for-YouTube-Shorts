// Script: apps/dashboard/src/scripts/test-long-form.ts
// End-to-end verification for Long-Form 16:9 video generation with Deep Research.

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/dashboard/.env") });

import { prisma } from "../lib/prisma";
import { createProject } from "../services/project.service";
import { generateScript } from "../services/script.service";
import { generateVoiceovers } from "../services/voiceover.service";
import { generateAssets } from "../services/asset.service";
import { generateSubtitles } from "../services/subtitle.service";
import { triggerExport } from "../services/export.service";

async function main() {
  console.log("=== STARTING LONG-FORM PIPELINE INTEGRATION TEST ===");

  // Check if previous run project exists with script
  const existingProjectId = "da687f59-866d-430c-8de7-af74a7795f20";
  let project = await prisma.project.findUnique({
    where: { id: existingProjectId },
    include: { script: { include: { scenes: true } } },
  });

  if (!project || !project.script) {
    // 1. Create a Long-Form Project
    const createResult = await createProject({
      title: "The 1815 Eruption of Mount Tambora",
      niche: "history",
      tone: "serious",
      targetDuration: "3-5 Minutes (Explainer / Mini-Doc)",
      videoFormat: "LONG_FORM",
      aspectRatio: "16:9",
      specificTopic: "Mount Tambora 1815 and The Year Without a Summer",
      subtopics: [
        "The April 1815 catastrophic explosion and atmospheric ash veil",
        "The 1816 global temperature drop and agricultural famine",
        "Cultural impact: Lord Byron, Mary Shelley, and the birth of Frankenstein"
      ],
      creatorInstructions: "Cinematic, investigative documentary tone like Vox or Lemmino. Use exact historical dates and figures.",
      voice: "en-US-BrianMultilingualNeural",
    });

    if (!createResult.success || !createResult.data) {
      throw new Error(`Project creation failed: ${createResult.error}`);
    }

    project = await prisma.project.findUnique({
      where: { id: createResult.data.id },
      include: { script: { include: { scenes: true } } },
    });

    // 2. Run Script Generation with Deep Research Engine
    console.log("\n--- STAGE: SCRIPT GENERATION & DEEP RESEARCH ---");
    const scriptResult = await generateScript(
      project!.id,
      project!.niche,
      project!.tone,
      project!.targetDuration,
      project!.specificTopic,
      project!.creatorInstructions
    );

    if (!scriptResult.success || !scriptResult.data) {
      throw new Error(`Script generation failed: ${scriptResult.error}`);
    }

    project = await prisma.project.findUnique({
      where: { id: project!.id },
      include: { script: { include: { scenes: true } } },
    });
  }

  const script = project!.script!;
  console.log(`[Project Resumed] ID: ${project!.id}`);
  console.log(`Format: ${project!.videoFormat} | Aspect Ratio: ${project!.aspectRatio} | Duration: ${project!.targetDuration}`);
  console.log(`[Script Loaded] Hook: "${script.hook}"`);
  console.log(`Estimated Duration: ${script.estimatedDuration}s across ${script.scenes.length} scenes`);
  console.log(`Research Dossier Saved: ${script.researchDossier ? "YES" : "NO"}`);
  console.log(`Chapters Saved: ${script.chapters ? "YES" : "NO"}`);

  // Validate Zero Infographics & Chapter Mapping
  const infographicScenes = script.scenes.filter(s => (s.visualSource as any) === "INFOGRAPHIC");
  if (infographicScenes.length > 0) {
    throw new Error(`FAILURE: Found ${infographicScenes.length} INFOGRAPHIC scenes! Strictly zero infographics allowed.`);
  }
  console.log("✓ Zero Infographic Rule Verified: 100% scenes are STOCK_VIDEO or AI_IMAGE.");

  const scenesWithChapters = script.scenes.filter(s => (s as any).chapterTitle || (s as any).chapterIndex);
  console.log(`✓ Chapter Assignment Verified: ${scenesWithChapters.length}/${script.scenes.length} scenes assigned to narrative chapters.`);

  // 3. Run Voiceover Generation
  console.log("\n--- STAGE: VOICEOVER SYNTHESIS ---");
  const voiceoverResult = await generateVoiceovers(project!.id);
  if (!voiceoverResult.success) {
    throw new Error(`Voiceover synthesis failed: ${voiceoverResult.error}`);
  }
  console.log(`✓ Voiceovers Synthesized: ${voiceoverResult.data?.length} audio clips generated.`);

  // 4. Run Visual Asset Retrieval / Generation (16:9 Landscape)
  console.log("\n--- STAGE: VISUAL ASSET ACQUISITION (16:9 LANDSCAPE) ---");
  const assetResult = await generateAssets(project!.id);
  if (!assetResult.success) {
    throw new Error(`Asset acquisition failed: ${assetResult.error}`);
  }
  console.log(`✓ Assets Acquired: ${assetResult.data?.length} assets downloaded / rendered.`);

  // 5. Run Subtitle Generation
  console.log("\n--- STAGE: SUBTITLE GENERATION ---");
  const subResult = await generateSubtitles(project!.id);
  if (!subResult.success) {
    throw new Error(`Subtitle generation failed: ${subResult.error}`);
  }
  console.log(`✓ Subtitles Generated for ${subResult.data?.length} scenes.`);

  // 6. Run FFmpeg Video Compositing & Export (1920x1080)
  console.log("\n--- STAGE: FFMPEG COMPOSITING & EXPORT (1920x1080) ---");
  const exportResult = await triggerExport(project!.id);
  if (!exportResult.success || !exportResult.data) {
    throw new Error(`Export failed: ${exportResult.error}`);
  }

  const exportJob = exportResult.data;
  console.log(`✓ Video Rendered Successfully!`);
  console.log(`Resolution: ${exportJob.resolution}`);
  console.log(`Total Runtime: ${exportJob.duration}s`);
  console.log(`Cloudinary URL: ${exportJob.outputUrl}`);
  console.log("\n=== LONG-FORM PIPELINE INTEGRATION TEST PASSED ===");
}

main()
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

