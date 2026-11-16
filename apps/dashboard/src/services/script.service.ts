// File Location: src/services/script.service.ts
// Business logic for AI script generation and database persistence.
// Owns the Gemini call, Zod validation, and Prisma write — actions just call through.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import { generateStructuredContent } from "./ai/gemini";
import { buildCreativeBriefPrompt, buildScriptPrompt, getDurationMetrics } from "./ai/prompts";
import { scriptResponseSchema, creativeBriefSchema } from "@/validations/script.schema";
import { normalizeSceneVisualRouting } from "./script/visual-routing-normalizer";
import { enforcePromptQuality } from "./script/prompt-quality-enforcer";
import { executeDeepResearch, type ResearchDossier } from "./research.service";
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

    // 4. STAGE 0: Deep Research Engine (Triggered for long-form video or if subtopics/topic guidance present)
    const metrics = getDurationMetrics(targetDuration);
    let researchDossier: ResearchDossier | null = null;
    const shouldResearch = project.videoFormat === "LONG_FORM" || metrics.isLongForm || (project.subtopics && project.subtopics.length > 0);

    if (shouldResearch) {
      console.log(`[ScriptService] Initiating Deep Research Engine for project "${project.title}"...`);
      try {
        researchDossier = await executeDeepResearch({
          topic: specificTopic || project.specificTopic || niche,
          niche,
          tone,
          targetDuration,
          subtopics: project.subtopics || [],
          creatorInstructions,
        });
        console.log(`[ScriptService] Deep Research completed with ${researchDossier.factualDossier?.length || 0} factual discoveries and ${researchDossier.chapters?.length || 0} chapters.`);
      } catch (err) {
        console.warn("[ScriptService] Deep research encountered an error, falling back to direct brief generation:", err);
      }
    }

    // 5. STAGE 1: Generate Creative Brief
    const briefPrompt = buildCreativeBriefPrompt(
      niche,
      tone,
      targetDuration,
      specificTopic,
      creatorInstructions,
      recentMemoryString,
      researchDossier,
      project.subtopics || []
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

    // 6. STAGE 2: Generate Script from locked brief
    const scriptPrompt = buildScriptPrompt(
      creativeBrief,
      targetDuration,
      researchDossier,
      project.aspectRatio || (project.videoFormat === "LONG_FORM" ? "16:9" : "9:16")
    );
    
    // TEMPORARY LOGGING FOR DEBUGGING ROUTING RULES
    console.log("=== STAGE 2 PROMPT START ===");
    console.log(scriptPrompt);
    console.log("=== STAGE 2 PROMPT END ===");

    const rawData = await generateStructuredContent(scriptPrompt);

    // 7. Validate with Zod
    const parseResult = scriptResponseSchema.safeParse(rawData);

    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`AI response validation failed: ${errors}`);
    }

    // 7b. Enforce prompt quality — rewrite generic/low-quality AI prompts
    const enforcedData = enforcePromptQuality(parseResult.data, {
      projectId: project.id,
      niche: project.niche,
      duration: project.targetDuration,
    });

    const aiData = normalizeSceneVisualRouting(enforcedData, {
      maxAiImageScenes: project.maxAiImageScenes,
      preferredMotionRatio: project.preferredMotionRatio,
      projectNiche: project.niche
    });

    // 7c. Ensure Long-Form scripts achieve the selected runtime via automated narrative expansion
    let currentTotalWords = aiData.scenes.reduce(
      (sum, s) => sum + s.narrationText.trim().split(/\s+/).filter(Boolean).length,
      0
    );

    if (metrics.isLongForm && currentTotalWords < metrics.minWords) {
      const shortfall = metrics.minWords - currentTotalWords;
      console.log(
        `[ScriptService] Script word count (${currentTotalWords} words) is below target minimum (${metrics.minWords} words). Requesting narrative expansion of ~${shortfall} words...`
      );

      const expansionPrompt = `
You are the lead documentary scriptwriter for this project.
Your initial script contains ${aiData.scenes.length} scenes with ${currentTotalWords} spoken words.
However, to fill "${targetDuration}" at human TTS speaking pace (~2.4 words/sec), you MUST reach at least ${metrics.minWords} spoken words (shortfall: ${shortfall} words).

Core Topic: ${creativeBrief.coreTopic}
Content Angle: ${creativeBrief.contentAngle}
Research Dossier:
${JSON.stringify(researchDossier?.factualDossier?.slice(0, 6) || [], null, 2)}

Existing Scenes:
${aiData.scenes.map((s, idx) => `[Scene ${idx + 1}] (${s.onScreenCaption}): "${s.narrationText}"`).join("\n")}

TASK:
Write 4 to 8 additional consecutive documentary scenes that delve deeper into the factual mechanisms, eyewitness quotes, or long-term societal aftermath.
DO NOT use INFOGRAPHIC. All scenes must be STOCK_VIDEO or AI_IMAGE.

Return ONLY a raw JSON object with this exact structure:
{
  "additionalScenes": [
    {
      "chapterIndex": ${aiData.scenes[aiData.scenes.length - 1].chapterIndex || 1},
      "chapterTitle": "${aiData.scenes[aiData.scenes.length - 1].chapterTitle || "Act Aftermath"}",
      "narrationText": "1-2 detailed, punchy sentences.",
      "visualPrompt": "Detailed cinematic prompt for video/image.",
      "onScreenCaption": "Short caption",
      "searchKeywords": ["stock", "search", "terms"],
      "assetSearches": [
        { "query": "primary stock video query", "type": "video", "purpose": "primary" },
        { "query": "fallback query", "type": "video", "purpose": "secondary" }
      ],
      "visualRole": "LITERAL_FOOTAGE",
      "visualSource": "STOCK_VIDEO",
      "duration": 6.5
    }
  ]
}
`.trim();

      try {
        const rawExpansion = await generateStructuredContent(expansionPrompt);
        if (rawExpansion && Array.isArray((rawExpansion as any).additionalScenes)) {
          const newScenes = (rawExpansion as any).additionalScenes;
          console.log(`[ScriptService] Successfully generated ${newScenes.length} additional scenes.`);
          aiData.scenes.push(...newScenes);
        }
      } catch (expansionErr) {
        console.warn("[ScriptService] Script expansion turn failed, proceeding with original scenes:", expansionErr);
      }
    }

    // 7d. Sanitize scene durations against actual speech rate (~2.4 words/sec)
    // Prevents hallucinated durations from corrupting estimates
    let totalRealisticDuration = 0;
    for (const scene of aiData.scenes) {
      const words = scene.narrationText.trim().split(/\s+/).filter(Boolean).length;
      const speechDuration = parseFloat((words / 2.4).toFixed(2));
      if (scene.duration > speechDuration * 1.8 && scene.duration > 7.0) {
        console.warn(
          `[ScriptService] Clamping bloated duration (${scene.duration}s for ${words} words) to ${Math.max(speechDuration, 4.0)}s`
        );
        scene.duration = Math.max(speechDuration, 4.0);
      }
      totalRealisticDuration += scene.duration;
    }
    aiData.estimatedDuration = parseFloat(totalRealisticDuration.toFixed(2));

    // TEMPORARY LOGGING FOR DEBUGGING ROUTING RULES
    console.log("=== NORMALIZED SCENES START ===");
    aiData.scenes.forEach((scene, index) => {
      console.log(`[Scene ${index + 1}] source=${scene.visualSource || 'UNSET'} role=${scene.visualRole || 'UNSET'} caption="${scene.onScreenCaption}"`);
    });
    console.log("=== NORMALIZED SCENES END ===");

    // 8. Persist to database (including the generated brief, research dossier, and chapters)
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
        researchDossier: researchDossier ? (researchDossier as any) : undefined,
        chapters: (aiData as any).chapters || (researchDossier as any)?.chapters || undefined,
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
            chapterIndex: (scene as any).chapterIndex ?? null,
            chapterTitle: (scene as any).chapterTitle ?? null,
          })),
        },
      },
      include: {
        scenes: true,
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
