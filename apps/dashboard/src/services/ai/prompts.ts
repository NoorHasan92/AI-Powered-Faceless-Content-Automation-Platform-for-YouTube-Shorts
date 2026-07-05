// File Location: src/services/ai/prompts.ts
// Prompt templates for AI content generation.
// Centralized here so prompts can be versioned, tested, and swapped independently.

import type { CreativeBrief } from "@/validations/script.schema";

/**
 * Stage 1: Builds the prompt to generate the structured Creative Brief.
 */
export function buildCreativeBriefPrompt(
  niche: string,
  tone: string,
  targetDuration: string,
  specificTopic?: string | null,
  creatorInstructions?: string | null,
  recentMemory: string = ""
): string {
  const specificTopicContext = specificTopic 
    ? `The user requested this EXACT topic: "${specificTopic}". You must lock this as the coreTopic.` 
    : `The user provided a broad niche: "${niche}". Pick a highly engaging, specific topic within this niche to be the coreTopic.`;

  const creatorContext = creatorInstructions
    ? `The user provided these explicit Director Notes:\n"${creatorInstructions}"\nThese constraints are non-negotiable and must shape the brief heavily.`
    : `No specific director notes provided. Optimize for standard viral shorts best practices.`;

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
You are an expert Content Strategist for a YouTube Shorts automation channel.
Your task is to lock in a rigid, structured "Creative Brief" before the script is written.

Inputs:
- Niche: ${niche}
- Tone: ${tone}
- Target Duration: ${targetDuration}
- Topic Guidance: ${specificTopicContext}
- Creator Notes: ${creatorContext}
- Recent Topics Guidance: ${deduplicationContext}

Goal:
Normalize these inputs into a JSON object that forces the downstream script writer to strictly obey the requested angle and avoid drifting into generic territory. 

You must return ONLY a raw JSON object matching this exact structure:
{
  "coreTopic": "The exact, locked topic (e.g., 'Smartphone notifications hijacking student focus')",
  "audienceContext": "Who this is for and the expected framing",
  "contentAngle": "The specific angle or lens to view the topic through",
  "endingStyle": "The required psychological payoff (e.g., 'reflective', 'call to action')",
  "requiredAnchors": ["concrete noun 1", "concrete concept 2"],
  "forbiddenDriftTopics": ["generic adjacent topic 1", "generic adjacent topic 2"],
  "contentConstraints": ["behavioral rule 1", "behavioral rule 2"],
  "visualExpectations": "High-level directives for scene planning",
  "toneGuidance": "Translation of the requested tone into operational script instructions",
  "durationGuidance": "Translation of the requested pacing/duration into operational instructions"
}

Rules for the Brief:
- If the Topic Guidance specifies a topic, DO NOT generalize it. Lock it exactly.
- Populate 'requiredAnchors' with concrete nouns from the inputs that MUST appear in the final script.
- Populate 'forbiddenDriftTopics' with generic topics that the AI often defaults to (e.g., if the topic is phone addiction for students, forbid 'time-boxing' or 'pomodoro technique').
- Populate 'contentConstraints' with explicit editorial rules based on the Creator Notes.
`.trim();
}

/**
 * Stage 2: Builds the script generation prompt for Gemini using the locked Creative Brief.
 * The output shape must match scriptResponseSchema in validations/script.schema.ts.
 */
export function buildScriptPrompt(
  brief: CreativeBrief,
  targetDuration: string
): string {
  return `
You are an expert short-form video scriptwriter and director.
Create a highly engaging, viral-style script for a YouTube Short following the provided Creative Brief EXACTLY.

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

--- VISUAL EXPECTATIONS OVERRIDE ---
The Creator explicitly provided this visual direction:
"${brief.visualExpectations}"
You MUST heavily bias your \`visualRole\` and \`visualSource\` selections to satisfy these instructions. If the notes request surreal, abstract, internal brain activity, or impossible-to-film imagery, you MUST use \`AI_IMAGE\` aggressively instead of stock footage.
----------------------

Target Duration (strict): ${targetDuration}

You must return ONLY a raw JSON object matching this exact structure:
{
  "hook": "A 1-2 sentence extremely catchy opening.",
  "bodyText": "The main educational or entertaining content.",
  "cta": "A short call to action to subscribe or like.",
  "metaTitle": "A clickbait-friendly title under 50 characters",
  "metaDescription": "A 2-sentence description for the video",
  "estimatedDuration": 35,
  "scenes": [
    {
      "narrationText": "The hippocampus acts like a temporal index, organizing our experiences.",
      "visualPrompt": "A glowing, surreal 3D brain made of fiber optic cables pulsing with light.",
      "visualIntent": "Abstract visualization of memory encoding in the brain.",
      "onScreenCaption": "Memory Index",
      "searchKeywords": ["brain", "memory", "synapse"],
      "assetSearches": [
        { "query": "brain illustration", "type": "video", "purpose": "primary" }
      ],
      "visualRole": "ABSTRACT_ANIMATION",
      "visualSource": "AI_IMAGE",
      "generatedAssetPrompt": "Cinematic macro shot of glowing neurons, synaptic flashes, ethereal blue lighting, 8k resolution.",
      "infographicPayload": null,
      "endingIntent": null,
      "duration": 4.5
    },
    {
      "narrationText": "When this index misfires, it creates a latency error we call déjà vu.",
      "visualPrompt": "A split-screen diagram comparing sensory input timing.",
      "visualIntent": "Explain the delay in sensory processing.",
      "onScreenCaption": "Latency Error",
      "searchKeywords": ["signal processing", "timeline"],
      "assetSearches": [
        { "query": "diagram graphic", "type": "image", "purpose": "fallback" }
      ],
      "visualRole": "INFOGRAPHIC",
      "visualSource": "INFOGRAPHIC",
      "generatedAssetPrompt": null,
      "infographicPayload": { "title": "Sensory Pathway", "data": "Timing mismatch" },
      "endingIntent": null,
      "duration": 4.0
    }
  ]
}

Rules:
- IMPORTANT: The sum of all scene \`duration\` values MUST closely match the Target Duration (${targetDuration}). 
- Do NOT hardcode the scene count. Scale the number of scenes up or down dynamically to fit the Target Duration perfectly (e.g. longer durations require more scenes, shorter durations require fewer scenes).
- Ensure the visualPrompts are highly descriptive for an AI image/video generator.
- The \`duration\` should be an estimated time in seconds to speak the narration text for that specific scene.
- \`estimatedDuration\` should be the mathematical sum of all scene durations.
- \`searchKeywords\` should be 2-4 broad relevant terms (light semantic tags).
- \`assetSearches\` must be an ordered array of 3 specific asset retrieval queries, from highly specific to broad fallback. Valid types are "video" or "image".
- \`visualRole\` must be one of: "LITERAL_FOOTAGE", "ABSTRACT_ANIMATION", "INFOGRAPHIC", "DEMONSTRATION", "TRANSITION".
- \`visualSource\` must be one of: "STOCK_VIDEO", "STOCK_IMAGE", "AI_IMAGE", "INFOGRAPHIC".
- **Scene Classification Rule**: Before assigning \`visualSource\`, you MUST mentally classify the scene into one of three buckets:
  1. LITERAL_REAL_WORLD or ABSTRACT_CONNECTIVE_FILLER
  2. EXPLANATORY_MECHANISM (timelines, comparisons, step-by-step)
  3. SURREAL_HERO_MOMENT (impossible to film, highly emotional/cinematic)
  Then, you MUST apply this strict priority mapping:
  - Prefer \`STOCK_VIDEO\` for literal action AND abstract/connective filler (e.g. glowing loops, abstract particles).
  - Prefer \`INFOGRAPHIC\` for explanatory mechanisms, diagrams, timelines, or comparisons.
  - Use \`AI_IMAGE\` ONLY for the most visually important surreal hero moments or impossible-to-film emotional climaxes.
  - \`STOCK_IMAGE\` should only be used as a last resort fallback.
- **Source Selection Rule (HARD ROUTING)**:
  - Use \`STOCK_VIDEO\` as the primary workhorse. For literal scenes, use standard queries. For abstract scenes, use motion-friendly query templates (e.g., "glowing neural network loop", "abstract signal glitch animation", "fractal tunnel").
  - Use \`INFOGRAPHIC\` when the scene primarily depicts percentages, comparisons, rankings, before/after logic, step-based explanations, mechanism diagrams, or process/timeline visuals.
  - Use \`AI_IMAGE\` sparingly. It is a limited "hero scene" resource. Only use it when the scene is a central thesis or emotional climax that requires impossible visualizations.
  - Use \`STOCK_IMAGE\` only when no motion-capable option is plausible.
- **Role-Source Mapping**: 
  - ABSTRACT_ANIMATION -> prefer STOCK_VIDEO (abstract loops) or AI_IMAGE (if hero scene)
  - INFOGRAPHIC -> must use INFOGRAPHIC
  - DEMONSTRATION / LITERAL_FOOTAGE -> strongly prefer STOCK_VIDEO
  - TRANSITION -> prefer STOCK_VIDEO or INFOGRAPHIC
- If \`visualSource\` is "AI_IMAGE", you MUST provide a detailed \`generatedAssetPrompt\` optimized for an AI Image generator (e.g. Flux/Midjourney). Otherwise leave it null.
- If \`visualSource\` is "INFOGRAPHIC", provide a basic JSON in \`infographicPayload\` (e.g. {"title": "Fact"}). Otherwise leave it null.
- You must shape the \`assetSearches\` queries based on the chosen \`visualRole\` (e.g., LITERAL_FOOTAGE -> direct real-world footage, ABSTRACT_ANIMATION -> conceptual visuals).
- Do NOT use the same \`visualRole\` more than two scenes in a row. Maintain high visual variety.
- **Pacing & Scene Beats**: Prefer short, fast-paced scenes for Shorts. Most scenes should land around 2–5 seconds unless the concept clearly needs more time. Never exceed 1-2 short sentences per scene. Require scene boundaries to strictly match natural sentence boundaries (no awkward mid-sentence scene cuts).
- **Semantic Density**: If a single beat contains multiple unrelated or highly complex concepts, you MUST split it into two rapid consecutive scenes. If it cannot be split, you must select one overarching abstract thematic visual strategy for the scene, rather than attempting a combined 'frankenstein' query.
- **Closing Scene Intelligence**: For the final scene, explicitly declare the \`endingIntent\` as one of: "CTA", "EMOTIONAL_PAYOFF", "PRACTICAL_ADVICE".
  - **Ending Intent -> Visual Source Override**: If \`endingIntent\` is "EMOTIONAL_PAYOFF" (e.g., existential themes, "question reality", "your brain is lying to you"), you MUST strongly default to \`visualRole = ABSTRACT_ANIMATION\` and \`visualSource = AI_IMAGE\`, unless the scene explicitly contains numbers, steps, comparisons, or mechanism diagrams. Do NOT use generic INFOGRAPHIC for emotional/existential ending scenes.
  - For non-final scenes, omit \`endingIntent\` or leave it null.
- **Anchor Coverage Rule**: You MUST preserve and repeat the 'Required Anchors' across multiple scenes, examples, and visual plans.
- **Forbidden Drift**: You are strictly forbidden from writing about any of the 'Forbidden Drift Topics'.
- **Content Constraints**: You must rigidly follow every rule listed in 'Content Constraints'.
- **SELF-CHECK**: For each scene, ask: could a normal stock video library realistically contain a strong literal asset for this exact scene? If no, do not use STOCK_VIDEO. Use AI_IMAGE or INFOGRAPHIC instead. Finally, review the brief to ensure the script completely satisfies the core topic and constraints. If not, rewrite.
`.trim();
}
