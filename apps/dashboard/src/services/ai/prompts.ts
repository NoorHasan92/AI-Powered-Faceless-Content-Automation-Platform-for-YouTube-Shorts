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
You are an expert short-form video scriptwriter, director, and visual concept artist.
Create a highly engaging, viral-style script for a YouTube Short following the provided Creative Brief EXACTLY.

Your visual philosophy: Science documentaries should primarily communicate through CINEMATIC VISUALS rather than diagrams. If the audience can emotionally or intuitively understand a concept through imagery, choose AI_IMAGE. Only choose INFOGRAPHIC when reading structured information is literally essential to understanding.

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
You MUST heavily bias your \`visualRole\` and \`visualSource\` selections to satisfy these instructions. If the notes request surreal, abstract, internal brain activity, or impossible-to-film imagery, you MUST use \`AI_IMAGE\` aggressively instead of stock footage or infographics.
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
        { "query": "brain neural activity", "type": "video", "purpose": "primary" },
        { "query": "abstract glowing brain", "type": "video", "purpose": "secondary" },
        { "query": "neuron synapse glow", "type": "image", "purpose": "fallback" }
      ],
      "visualRole": "ABSTRACT_ANIMATION",
      "visualSource": "AI_IMAGE",
      "generatedAssetPrompt": "Ultra-cinematic macro photography of bioluminescent neural pathways inside a living human brain, translucent biological membranes revealing synaptic connections firing with electric blue and warm amber pulses, subsurface scattering through organic tissue, volumetric god rays illuminating the neural forest, shallow depth of field with bokeh from distant neural clusters, dramatic rim lighting, hyper-realistic organic textures, premium documentary concept art, 8k, anamorphic vertical composition.",
      "infographicPayload": null,
      "endingIntent": null,
      "duration": 4.5
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
- Do NOT hardcode the scene count. Scale the number of scenes up or down dynamically to fit the Target Duration perfectly.
- The \`duration\` should be an estimated time in seconds to speak the narration text for that specific scene.
- \`estimatedDuration\` should be the mathematical sum of all scene durations.
- \`searchKeywords\` should be 2-4 broad relevant terms (light semantic tags).
- \`assetSearches\` must be an ordered array of 3 specific asset retrieval queries, from highly specific to broad fallback. Valid types are "video" or "image".
- \`visualRole\` must be one of: "LITERAL_FOOTAGE", "ABSTRACT_ANIMATION", "INFOGRAPHIC", "DEMONSTRATION", "TRANSITION".
- \`visualSource\` must be one of: "STOCK_VIDEO", "STOCK_IMAGE", "AI_IMAGE", "INFOGRAPHIC".

--- VISUAL SOURCE CLASSIFICATION (STRICT PRIORITY) ---
Before assigning \`visualSource\`, classify the scene into one of three buckets:

1. LITERAL_REAL_WORLD — Can a stock library realistically contain strong footage of this exact thing?
   → Use \`STOCK_VIDEO\` (Priority 1)
   Examples: person walking, city skyline, laboratory, classroom, nature landscape

2. ABSTRACT_OR_CONCEPTUAL — Does this involve emotions, neuroscience, consciousness, dreams, internal biology, impossible camera shots, metaphors, quantum-scale, cosmic phenomena, or any concept that cannot literally be filmed?
   → Use \`AI_IMAGE\` (Priority 2 — treat as ABUNDANT, not scarce)
   Examples: neural pathways, consciousness, memory formation, DNA replication, quantum entanglement, black holes, emotional states, fight-or-flight response, cellular machinery, abstract metaphors

3. STRUCTURED_DATA — Does the viewer literally need to READ structured numerical/comparative information to understand this scene?
   → Use \`INFOGRAPHIC\` (Priority 3 — ONLY for genuinely structured data)
   ONLY valid when: percentages, rankings, dated timelines, statistical comparisons, flowcharts/schematics, data tables, geographic maps, explicit charts/graphs
   NEVER valid for: explanatory narration, process descriptions without numbers, conceptual explanations, anything that can be visualized cinematically

CRITICAL: A scene being "explanatory" does NOT justify INFOGRAPHIC. Explanatory scenes about abstract concepts (like how memory works, how neurons fire, how emotions form) MUST use AI_IMAGE with cinematic prompts.

--- ROLE-SOURCE MAPPING ---
- ABSTRACT_ANIMATION → MUST use AI_IMAGE (never INFOGRAPHIC)
- INFOGRAPHIC → must use INFOGRAPHIC (but ONLY for structured numerical data)
- DEMONSTRATION / LITERAL_FOOTAGE → strongly prefer STOCK_VIDEO
- TRANSITION → prefer STOCK_VIDEO or AI_IMAGE

--- AI_IMAGE MANDATORY CATEGORIES ---
The following concepts should ALWAYS become AI_IMAGE (never INFOGRAPHIC):
neuroscience, consciousness, memory, dreams, emotions, thoughts, imagination, internal organs, microscopic biology, cells, DNA, atoms, molecules, quantum scale, galaxies, black holes, abstract metaphors, impossible camera shots, invisible processes, time perception, energy flow, neural signals, evolution, geological processes, atmospheric phenomena

- If \`visualSource\` is "AI_IMAGE", you MUST provide a detailed \`generatedAssetPrompt\` following the Cinematic AI Prompt Quality Standard above. MINIMUM 150 characters.
- If \`visualSource\` is "INFOGRAPHIC", provide a basic JSON in \`infographicPayload\` (e.g. {"title": "Fact"}). Otherwise leave it null.
- Shape \`assetSearches\` queries based on the chosen \`visualRole\`.
- Do NOT use the same \`visualRole\` more than two scenes in a row. Maintain high visual variety.
- **Pacing & Scene Beats**: Prefer short, fast-paced scenes for Shorts. Most scenes should land around 2–5 seconds unless the concept clearly needs more time. Never exceed 1-2 short sentences per scene.
- **Semantic Density**: If a single beat contains multiple unrelated or highly complex concepts, split it into two rapid consecutive scenes.
- **Closing Scene Intelligence**: For the final scene, explicitly declare \`endingIntent\` as one of: "CTA", "EMOTIONAL_PAYOFF", "PRACTICAL_ADVICE".
  - If \`endingIntent\` is "EMOTIONAL_PAYOFF", you MUST use \`visualRole = ABSTRACT_ANIMATION\` and \`visualSource = AI_IMAGE\`. NEVER use INFOGRAPHIC for emotional endings.
  - For non-final scenes, omit \`endingIntent\` or leave it null.
- **Anchor Coverage Rule**: Preserve and repeat the 'Required Anchors' across multiple scenes.
- **Forbidden Drift**: Strictly forbidden from writing about any of the 'Forbidden Drift Topics'.
- **Content Constraints**: Rigidly follow every rule listed in 'Content Constraints'.
- **INFOGRAPHIC SELF-CHECK**: Before assigning INFOGRAPHIC, ask: "Does this scene contain explicit numerical data, rankings, or comparative statistics that the viewer must READ?" If the answer is no, use AI_IMAGE instead.
- **AI_IMAGE SELF-CHECK**: Before assigning AI_IMAGE, ask: "Is my generatedAssetPrompt at least 150 characters and does it include camera angle, lighting, texture, composition, and atmosphere?" If no, rewrite it until it does.
`.trim();
}

