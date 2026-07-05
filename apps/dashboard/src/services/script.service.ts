// File Location: src/services/script.service.ts
// Business logic for AI script generation and database persistence.
// Owns the Gemini call, Zod validation, and Prisma write — actions just call through.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import { generateStructuredContent } from "./ai/gemini";
import { buildCreativeBriefPrompt, buildScriptPrompt } from "./ai/prompts";
import { scriptResponseSchema, creativeBriefSchema } from "@/validations/script.schema";
import { normalizeSceneVisualRouting } from "./script/visual-routing-normalizer";
import type { Script } from "@prisma/client";

/**
 * Generate a script for a project using the Gemini AI.
 *
 * Flow:
 * 1. Set project status to GENERATING_SCRIPT
 * 2. Delete any existing script (for retry/regeneration)
 * 3. Call Gemini with the prompt
 * 4. Validate the AI response with Zod
 * 5. Save validated data to the database
 * 6. Update project status to GENERATING_ASSETS
 */
export async function generateScript(
  projectId: string,
  niche: string,
  tone: string,
  targetDuration: string,
  specificTopic?: string | null,
  creatorInstructions?: string | null
): Promise<ServiceResult<Script>> {
  try {
    // 1. Mark as in-progress and fetch project budget settings
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { status: "GENERATING_SCRIPT" },
    });

    // 2. Clean up any previous script (supports retry after failure)
    await prisma.script.deleteMany({
      where: { projectId },
    });

    // 3. Fetch recent scripts to prevent idea duplication and build structured memory
    const recentProjects = await prisma.project.findMany({
      where: { status: { not: "FAILED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { script: true }
    });

    const recentMemory = recentProjects
      .filter(p => p.script?.creativeBrief)
      .map(p => {
        const brief = p.script!.creativeBrief as any;
        return {
          coreTopic: brief.coreTopic,
          contentAngle: brief.contentAngle,
          requiredAnchors: brief.requiredAnchors,
          endingStyle: brief.endingStyle
        };
      });
      
    const recentMemoryString = recentMemory.length > 0 ? JSON.stringify(recentMemory, null, 2) : "";

    // 4. STAGE 1: Generate Creative Brief
    const briefPrompt = buildCreativeBriefPrompt(
      niche,
      tone,
      targetDuration,
      specificTopic,
      creatorInstructions,
      recentMemoryString
    );
    const rawBrief = await generateStructuredContent(briefPrompt);
    const briefParseResult = creativeBriefSchema.safeParse(rawBrief);
    
    if (!briefParseResult.success) {
      const errors = briefParseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Stage 1 Creative Brief validation failed: ${errors}`);
    }
    const creativeBrief = briefParseResult.data;

    // 5. STAGE 2: Generate Script from locked brief
    const scriptPrompt = buildScriptPrompt(
      creativeBrief,
      targetDuration
    );
    
    // TEMPORARY LOGGING FOR DEBUGGING ROUTING RULES
    console.log("=== STAGE 2 PROMPT START ===");
    console.log(scriptPrompt);
    console.log("=== STAGE 2 PROMPT END ===");

    const rawData = await generateStructuredContent(scriptPrompt);

    // 4. Validate with Zod — replaces the old manual validateAIResponse()
    const parseResult = scriptResponseSchema.safeParse(rawData);

    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`AI response validation failed: ${errors}`);
    }

    const aiData = normalizeSceneVisualRouting(parseResult.data, {
      maxAiImageScenes: project.maxAiImageScenes,
      preferredMotionRatio: project.preferredMotionRatio,
      aiImageFallbackDisabled: project.aiImageFallbackDisabled,
      projectNiche: project.niche
    });

    // TEMPORARY LOGGING FOR DEBUGGING ROUTING RULES
    console.log("=== NORMALIZED SCENES START ===");
    aiData.scenes.forEach((scene, index) => {
      console.log(`[Scene ${index + 1}] source=${scene.visualSource || 'UNSET'} role=${scene.visualRole || 'UNSET'} caption="${scene.onScreenCaption}"`);
    });
    console.log("=== NORMALIZED SCENES END ===");

    // 6. Persist to database (including the generated brief)
    const script = await prisma.script.create({
      data: {
        projectId,
        hook: aiData.hook,
        bodyText: aiData.bodyText,
        cta: aiData.cta,
        metaTitle: aiData.metaTitle,
        metaDescription: aiData.metaDescription,
        estimatedDuration: aiData.estimatedDuration,
        creativeBrief: creativeBrief as any,
        scenes: {
          create: aiData.scenes.map((scene, index) => ({
            sceneIndex: index,
            narrationText: scene.narrationText,
            visualPrompt: scene.visualPrompt,
            onScreenCaption: scene.onScreenCaption,
            searchKeywords: scene.searchKeywords,
            assetSearches: scene.assetSearches,
            duration: scene.duration,
            visualRole: scene.visualRole as any,
            visualSource: (scene.visualSource as any) || "STOCK_VIDEO",
            visualSourcePlanned: (scene as any).visualSourcePlanned || null,
            motionTreatment: (scene as any).motionTreatment || "NONE",
            routingDowngradeReason: (scene as any).routingDowngradeReason || null,
            generatedAssetPrompt: scene.generatedAssetPrompt,
            infographicPayload: scene.infographicPayload,
            endingIntent: scene.endingIntent as any,
          })),
        },
      },
    });

    // 7. Advance pipeline
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "SCRIPT_READY" },
    });

    return { success: true, data: script };
  } catch (error) {
    console.error("Script generation error:", error);

    // Mark project as failed
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during script generation",
    };
  }
}

/**
 * Delete a project's script and all cascaded scenes.
 */
export async function deleteScript(projectId: string): Promise<void> {
  await prisma.script.deleteMany({
    where: { projectId },
  });
}
