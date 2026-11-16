// File Location: src/services/ai/prompts.ts
// Prompt templates for AI content generation.
// Centralized here so prompts can be versioned, tested, and swapped independently.

import type { CreativeBrief } from "@/validations/script.schema";

export interface DurationMetrics {
  targetSeconds: number;
  minWords: number;
  maxWords: number;
  minScenes: number;
  maxScenes: number;
  avgWordsPerScene: string;
  maxSceneDuration: number;
  isLongForm: boolean;
}

/**
 * Calculates deterministic word counts, scene counts, and pacing metrics
 * based on the target duration selection. Human speech rate is ~2.2 - 2.5 words/sec.
 */
export function getDurationMetrics(targetDuration: string): DurationMetrics {
  const norm = (targetDuration || "").toLowerCase();

  // 8-10 Minutes (Full Documentary)
  if (norm.includes("8-10") || norm.includes("10 min") || norm.includes("full documentary")) {
    return {
      targetSeconds: 540,
      minWords: 1150,
      maxWords: 1450,
      minScenes: 45,
      maxScenes: 65,
      avgWordsPerScene: "18-25 words",
      maxSceneDuration: 10.0,
      isLongForm: true,
    };
  }

  // 5-8 Minutes (Deep Dive)
  if (norm.includes("5-8") || norm.includes("8 min") || norm.includes("deep dive")) {
    return {
      targetSeconds: 390,
      minWords: 750,
      maxWords: 1000,
      minScenes: 32,
      maxScenes: 48,
      avgWordsPerScene: "18-24 words",
      maxSceneDuration: 9.5,
      isLongForm: true,
    };
  }

  // 3-5 Minutes (Explainer / Mini-Doc)
  if (norm.includes("3-5") || norm.includes("5 min") || norm.includes("mini-doc") || norm.includes("explainer")) {
    return {
      targetSeconds: 240,
      minWords: 450,
      maxWords: 620,
      minScenes: 20,
      maxScenes: 30,
      avgWordsPerScene: "16-22 words",
      maxSceneDuration: 9.0,
      isLongForm: true,
    };
  }

  // Shorts: 15-30 Seconds
  if (norm.includes("15-30") || norm.includes("punchy")) {
    return {
      targetSeconds: 25,
      minWords: 50,
      maxWords: 72,
      minScenes: 4,
      maxScenes: 6,
      avgWordsPerScene: "10-14 words",
      maxSceneDuration: 5.5,
      isLongForm: false,
    };
  }

  // Shorts: 30-50 Seconds
  if (norm.includes("30-50") || norm.includes("standard")) {
    return {
      targetSeconds: 42,
      minWords: 90,
      maxWords: 120,
      minScenes: 7,
      maxScenes: 10,
      avgWordsPerScene: "11-15 words",
      maxSceneDuration: 6.0,
      isLongForm: false,
    };
  }

  // Default: Shorts 55-60 Seconds (Full Short)
  return {
    targetSeconds: 58,
    minWords: 135,
    maxWords: 165,
    minScenes: 10,
    maxScenes: 14,
    avgWordsPerScene: "12-16 words",
    maxSceneDuration: 6.5,
    isLongForm: false,
  };
}

/**
 * Stage 1: Builds the prompt to generate the structured Creative Brief.
 */
export function buildCreativeBriefPrompt(
  niche: string,
  tone: string,
  targetDuration: string,
  specificTopic?: string | null,
  creatorInstructions?: string | null,
  recentMemory: string = "",
  researchDossier?: any,
  subtopics: string[] = []
): string {
  const metrics = getDurationMetrics(targetDuration);

  const specificTopicContext = specificTopic 
    ? `The user requested this EXACT topic: "${specificTopic}". You must lock this as the coreTopic.` 
    : `The user provided a broad niche: "${niche}". Pick a highly engaging, specific topic within this niche to be the coreTopic.`;

  const creatorContext = creatorInstructions
    ? `The user provided these explicit Director Notes:\n"${creatorInstructions}"\nThese constraints are non-negotiable and must shape the brief heavily.`
    : `No specific director notes provided. Optimize for standard viral YouTube best practices.`;

  const subtopicsContext = subtopics.length > 0
    ? `Key Subtopics/Acts to explicitly incorporate:\n${subtopics.map(s => `- ${s}`).join("\n")}`
    : "";

  let researchContext = "";
  if (researchDossier) {
    researchContext = `
--- DEEP RESEARCH DOSSIER (INPUT INTELLIGENCE) ---
Core Premise: ${researchDossier.corePremise || "N/A"}
YouTube Trend Demand: ${researchDossier.youtubeTrends?.join(", ") || "N/A"}

Top Competitor Angles & Opportunities:
${researchDossier.competitorAnalysis?.map((c: any) => `- "${c.viralTitle}": ${c.audienceCuriosityGap} (Our Opportunity: ${c.unaddressedOpportunity})`).join("\n") || "N/A"}

Hard Factual Timeline & Discoveries:
${researchDossier.factualDossier?.slice(0, 8).map((f: any) => `- [${f.category}] ${f.headline}: ${f.details}`).join("\n") || "N/A"}

Planned Multi-Act Chapters:
${researchDossier.chapters?.map((ch: any) => `Act ${ch.chapterIndex}: ${ch.title} (${ch.actType}) — Goal: ${ch.narrativeGoal}`).join("\n") || "N/A"}
-------------------------------------------------`;
  }

  let deduplicationContext = "";
  if (recentMemory) {
    if (specificTopic) {
      deduplicationContext = `The user requested an EXACT topic. You must NOT change this topic to avoid similarity. However, review this structured memory of recent scripts:
${recentMemory}
If your requested topic heavily overlaps with any of these recent scripts, you MUST keep the core topic locked but explicitly pivot the execution. You must vary at least TWO of the following compared to the recent similar script: contentAngle, requiredAnchors / examples, endingStyle, visual expectations.`;
    } else {
      deduplicationContext = `To prevent repetition, review this structured memory of recent scripts:
${recentMemory}
You must select a completely fresh and different coreTopic within the niche that does not overlap with any of the recent coreTopics.`;
    }
  } else {
    deduplicationContext = "No recent scripts in memory. Feel free to choose any highly engaging angle.";
  }

  return `
You are an expert Content Strategist for a high-production YouTube video automation platform.
Your task is to lock in a rigid, structured "Creative Brief" before the script is written.

Inputs:
- Niche: ${niche}
- Tone: ${tone}
- Target Duration: ${targetDuration} (Requires ~${metrics.minWords}–${metrics.maxWords} total spoken words across ${metrics.minScenes}–${metrics.maxScenes} scenes)
- Format: ${metrics.isLongForm ? "Long-Form YouTube Video (Multi-Chapter Documentary)" : "YouTube Short"}
- Topic Guidance: ${specificTopicContext}
${subtopicsContext}
- Creator Notes: ${creatorContext}
${researchContext}
- Recent Topics Guidance: ${deduplicationContext}

Goal:
Normalize these inputs into a JSON object that forces the downstream script writer to strictly obey the requested angle, factual discoveries, and avoid drifting into generic territory. 

You must return ONLY a raw JSON object matching this exact structure:
{
  "coreTopic": "The exact, locked topic",
  "audienceContext": "Who this is for and the expected framing",
  "contentAngle": "The specific angle or lens to view the topic through",
  "endingStyle": "The required psychological payoff (e.g., 'reflective', 'call to action', 'revelation')",
  "requiredAnchors": ["concrete noun 1", "concrete concept 2", "specific date or figure"],
  "forbiddenDriftTopics": ["generic adjacent topic 1", "generic adjacent topic 2"],
  "contentConstraints": ["behavioral rule 1", "behavioral rule 2"],
  "visualExpectations": "High-level directives for cinematic scene planning (NO text-only slides)",
  "toneGuidance": "Translation of the requested tone into operational script instructions",
  "durationGuidance": "Translation of the requested pacing/duration into operational instructions. MUST mandate ${metrics.minWords}-${metrics.maxWords} total spoken words across ${metrics.minScenes}-${metrics.maxScenes} scenes (~${metrics.avgWordsPerScene} per scene) to guarantee true ${targetDuration} runtime at human speech pace (~2.3 words/sec)."
}

Rules for the Brief:
- If the Topic Guidance specifies a topic, DO NOT generalize it. Lock it exactly.
- Populate 'requiredAnchors' with concrete facts and entities from the research dossier that MUST appear in the final script.
- Populate 'forbiddenDriftTopics' with generic topics that the AI often defaults to.
- Populate 'contentConstraints' with explicit editorial rules based on the Creator Notes.
- Populate 'durationGuidance' with the exact word count requirements (${metrics.minWords}-${metrics.maxWords} words) and scene requirements (${metrics.minScenes}-${metrics.maxScenes} scenes).
`.trim();
}

/**
 * Stage 2: Builds the script generation prompt for Gemini using the locked Creative Brief.
 * The output shape must match scriptResponseSchema in validations/script.schema.ts.
 */
export function buildScriptPrompt(
  brief: CreativeBrief,
  targetDuration: string,
  researchDossier?: any,
  aspectRatio: string = "9:16"
): string {
  const metrics = getDurationMetrics(targetDuration);
  const isLandscape = aspectRatio === "16:9" || metrics.isLongForm;

  let researchSection = "";
  if (researchDossier) {
    researchSection = `
--- DEEP RESEARCH DOSSIER FOR SCRIPTWRITING ---
Core Premise: ${researchDossier.corePremise || "N/A"}

Verified Factual Anchors (WEAVE THESE DIRECTLY INTO NARRATION):
${researchDossier.factualDossier?.map((f: any) => `- [${f.category}] ${f.headline}: ${f.details}`).join("\n") || "N/A"}

Chronological Progression:
${researchDossier.chronologicalTimeline?.map((t: any) => `- ${t.period}: ${t.event}`).join("\n") || "N/A"}

Multi-Act Chapters:
${researchDossier.chapters?.map((ch: any) => `[Chapter ${ch.chapterIndex}] ${ch.title} (${ch.actType}): Goal: ${ch.narrativeGoal} | Cover: ${ch.keyFactsToCover?.join(", ")}`).join("\n") || "N/A"}

High-Impact Viral Opening Hooks:
${researchDossier.viralHooks?.map((h: string, i: number) => `Option ${i + 1}: ${h}`).join("\n") || "N/A"}
----------------------------------------------`;
  }

  return `
You are an expert documentary scriptwriter, director, and visual concept artist for high-production YouTube videos (style of Vox, Johnny Harris, Kurzgesagt, and Magnates Media).
Create an exceptional, highly engaging script following the provided Creative Brief and Deep Research Dossier EXACTLY.

--- CREATIVE BRIEF ---
Core Topic: ${brief.coreTopic}
Audience Context: ${brief.audienceContext}
Content Angle: ${brief.contentAngle}
Ending Style: ${brief.endingStyle}
Required Anchors: ${brief.requiredAnchors.join(", ")}
Forbidden Drift Topics: ${brief.forbiddenDriftTopics.join(", ")}
Content Constraints:
${brief.contentConstraints.map(c => `- ${c}`).join("\n")}
Visual Expectations: ${brief.visualExpectations}
Tone Guidance: ${brief.toneGuidance}
Duration Guidance: ${brief.durationGuidance}
${researchSection}

--- VISUAL MEDIA PHILOSOPHY (STRICT: ZERO INFOGRAPHICS) ---
CRITICAL: DO NOT USE "INFOGRAPHIC". Sudden screens containing only static text or colored blocks look amateurish and severely hurt audience retention.
Captions already display on-screen text via styled subtitles.
Every single scene MUST use either:
1. STOCK_VIDEO (Priority 1) — Cinematic real-world B-roll, historical archival footage, landscape, technology, or human action.
2. AI_IMAGE (Priority 2) — For conceptual, surreal, neuroscience, microscopic biology, impossible camera angles, emotions, or cosmic scale (always paired with continuous camera motion like Ken Burns pan/zoom).

Allowed visualSource values: "STOCK_VIDEO" or "AI_IMAGE". NEVER "INFOGRAPHIC".
Allowed visualRole values: "LITERAL_FOOTAGE", "ABSTRACT_ANIMATION", "DEMONSTRATION", "TRANSITION". NEVER "INFOGRAPHIC".
Aspect Ratio Framing: ${isLandscape ? "16:9 Widescreen Landscape (1920x1080)" : "9:16 Vertical Portrait (1080x1920)"}. Shape all visual prompts for ${isLandscape ? "16:9 cinematic widescreen composition" : "9:16 vertical framing"}.

--- STRICT DURATION, WORD COUNT & PACING MATHEMATICS (NON-NEGOTIABLE) ---
Target Duration Category: ${targetDuration} (~${metrics.targetSeconds}s runtime)
1. TOTAL SPOKEN WORDS:
   - You MUST write between ${metrics.minWords} and ${metrics.maxWords} total spoken words across all scene narrations combined.
   - REASON: Real Text-to-Speech (TTS) speaks at ~2.3 words/second. To fill a ${targetDuration} video, you MUST provide at least ${metrics.minWords} words!
2. TOTAL SCENE COUNT:
   - You MUST generate between ${metrics.minScenes} and ${metrics.maxScenes} distinct scenes.
   - Dynamic visual cuts must happen every 4 to 8 seconds to prevent visual fatigue.
3. SCENE DURATION & WORD PACING:
   - Each scene must contain ~${metrics.avgWordsPerScene} (1-2 punchy sentences).
   - Every scene's \`duration\` value MUST mathematically reflect its narration length: duration ≈ narrationWords / 2.3 seconds.
   - HARD LIMIT: NO single scene duration may exceed ${metrics.maxSceneDuration} seconds.
   - NEVER fabricate an arbitrary high duration for a short sentence.
4. \`estimatedDuration\` MUST be the mathematical sum of all scene durations (~${metrics.targetSeconds}s).
${metrics.isLongForm ? "5. MULTI-ACT CHAPTERS: Assign each scene to its corresponding `chapterIndex` and `chapterTitle` based on the narrative arc." : ""}
------------------------------------------------------------------------

You must return ONLY a raw JSON object matching this exact structure:
{
  "hook": "A 1-2 sentence extremely catchy opening.",
  "bodyText": "The main educational or entertaining content.",
  "cta": "A short call to action to subscribe or like.",
  "metaTitle": "A clickbait-friendly title under 60 characters",
  "metaDescription": "A 2-sentence description for the video",
  "estimatedDuration": ${metrics.targetSeconds},
  "chapters": [
    {
      "chapterIndex": 1,
      "chapterTitle": "Act 1: The Inciting Mystery",
      "startScene": 0,
      "endScene": 5
    }
  ],
  "scenes": [
    {
      "chapterIndex": 1,
      "chapterTitle": "Act 1: The Inciting Mystery",
      "narrationText": "The explosion was heard nearly three thousand miles away, shattering the morning sky.",
      "visualPrompt": "Cinematic wide-angle aerial shot of a massive volcanic plume erupting into the stratosphere, dramatic dark volcanic ash clouds lit by lightning strikes.",
      "visualIntent": "Establishing the sheer scale of the historical catastrophe.",
      "onScreenCaption": "The Blast",
      "searchKeywords": ["volcano eruption explosion", "volcanic ash cloud storm", "catastrophe nature"],
      "assetSearches": [
        { "query": "volcanic eruption lightning storm", "type": "video", "purpose": "primary" },
        { "query": "massive dark ash cloud landscape", "type": "video", "purpose": "secondary" },
        { "query": "dark volcanic mountain smoke", "type": "video", "purpose": "fallback" }
      ],
      "visualRole": "LITERAL_FOOTAGE",
      "visualSource": "STOCK_VIDEO",
      "generatedAssetPrompt": null,
      "infographicPayload": null,
      "endingIntent": null,
      "duration": 5.5
    }
  ]
}

--- CINEMATIC AI PROMPT QUALITY STANDARD ---
CRITICAL: Every \`generatedAssetPrompt\` must read like something written by a professional concept artist for a premium documentary production house.

MANDATORY PROMPT STRUCTURE — every AI prompt must include ALL of these elements:
1. CAMERA ANGLE: macro photography, telephoto lens, wide establishing shot, low angle, overhead shot, extreme close-up, first-person perspective, isometric view, cross-sectional cutaway, impossible internal camera, cinematic tracking
2. LIGHTING STYLE: volumetric lighting, rim lighting, subsurface scattering, dramatic chiaroscuro, bioluminescent glow, golden hour, atmospheric fog, god rays, global illumination
3. TEXTURE QUALITY: hyper-realistic textures, photorealistic surfaces, translucent organic membranes, crystalline materials, wet reflective surfaces
4. COMPOSITION: anamorphic composition, rule-of-thirds framing, cinematic depth layering, shallow depth of field with bokeh
5. ATMOSPHERE: atmospheric fog, floating particles, volumetric haze, dust motes in light, subtle lens flare

FORBIDDEN generic phrases — NEVER use these alone:
❌ "beautiful", "highly detailed", "nice", "cool", "amazing"
❌ "brain" (alone), "neurons" (alone), "person thinking", "glowing neurons"
❌ Any prompt under 80 characters

Instead produce prompts comparable to professional Midjourney/concept art prompts (150–300 characters minimum).
---------------------------------------------

Rules:
- IMPORTANT: The sum of all scene \`duration\` values MUST closely match the Target Duration (${targetDuration}).
- Scale the number of scenes dynamically to fit the Target Duration perfectly (between ${metrics.minScenes} and ${metrics.maxScenes} scenes).
- The \`duration\` should be an estimated time in seconds to speak the narration text for that specific scene (~words / 2.3).
- \`estimatedDuration\` should be the mathematical sum of all scene durations.
- \`searchKeywords\` should be 2-4 broad relevant terms (light semantic tags).
- \`assetSearches\` must be an ordered array of 3 specific asset retrieval queries, from highly specific to broad fallback. Valid types are "video" or "image".
- \`visualRole\` must be one of: "LITERAL_FOOTAGE", "ABSTRACT_ANIMATION", "DEMONSTRATION", "TRANSITION". (DO NOT USE INFOGRAPHIC).
- \`visualSource\` must be one of: "STOCK_VIDEO" or "AI_IMAGE". (DO NOT USE INFOGRAPHIC).

--- VISUAL SOURCE CLASSIFICATION (STRICT: ZERO INFOGRAPHICS) ---
Every scene MUST be either real video B-roll or cinematic AI art:

1. LITERAL_REAL_WORLD — Real footage of landscapes, cities, people, technology, archival recreations, nature, disaster aftermath.
   → Use \`STOCK_VIDEO\` (Priority 1)

2. ABSTRACT_OR_CONCEPTUAL — Concepts involving deep science, emotions, neuroscience, cosmic scale, microscopic biology, impossible camera angles, or conceptual metaphors.
   → Use \`AI_IMAGE\` (Priority 2) with Midjourney-quality cinematic prompt.

--- AI_IMAGE MANDATORY CATEGORIES ---
The following concepts should ALWAYS become AI_IMAGE:
neuroscience, consciousness, memory, dreams, emotions, thoughts, imagination, internal organs, microscopic biology, cells, DNA, atoms, molecules, quantum scale, galaxies, black holes, abstract metaphors, impossible camera shots, invisible processes, time perception, energy flow, neural signals, evolution, geological processes, atmospheric phenomena

- If \`visualSource\` is "AI_IMAGE", you MUST provide a detailed \`generatedAssetPrompt\` following the Cinematic AI Prompt Quality Standard above. MINIMUM 150 characters.
- Shape \`assetSearches\` queries based on the chosen \`visualRole\`.
- Do NOT use the same \`visualRole\` more than two scenes in a row. Maintain high visual variety.
- **Pacing & Scene Beats**: Most scenes should land around 4–8 seconds. Never exceed 1-2 punchy sentences per scene.
- **Semantic Density**: If a single beat contains multiple unrelated or highly complex concepts, split it into two rapid consecutive scenes.
- **Closing Scene Intelligence**: For the final scene, explicitly declare \`endingIntent\` as one of: "CTA", "EMOTIONAL_PAYOFF", "PRACTICAL_ADVICE".
  - If \`endingIntent\` is "EMOTIONAL_PAYOFF", you MUST use \`visualRole = ABSTRACT_ANIMATION\` and \`visualSource = AI_IMAGE\`.
  - For non-final scenes, omit \`endingIntent\` or leave it null.
- **Anchor Coverage Rule**: Preserve and repeat the 'Required Anchors' across multiple scenes.
- **Forbidden Drift**: Strictly forbidden from writing about any of the 'Forbidden Drift Topics'.
- **Content Constraints**: Rigidly follow every rule listed in 'Content Constraints'.
- **AI_IMAGE SELF-CHECK**: Before assigning AI_IMAGE, ask: "Is my generatedAssetPrompt at least 150 characters and does it include camera angle, lighting, texture, composition, and atmosphere?" If no, rewrite it until it does.
`.trim();
}

