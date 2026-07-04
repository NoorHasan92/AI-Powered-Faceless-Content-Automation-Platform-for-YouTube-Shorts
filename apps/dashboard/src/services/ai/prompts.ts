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
      "narrationText": "The exact words spoken in this scene",
      "visualPrompt": "A highly detailed prompt for an AI video generator (e.g., 'Cinematic 4k shot of a glowing jellyfish, dark ocean background, neon colors')",
      "visualIntent": "Explain the goal of the visual, e.g., 'show how environment affects behavior in a realistic way'",
      "onScreenCaption": "1-4 words of punchy text to display on screen",
      "searchKeywords": ["keyword1", "keyword2", "keyword3"],
      "assetSearches": [
        {
          "query": "scientist in laboratory looking at brain scan",
          "type": "video",
          "purpose": "primary"
        },
        {
          "query": "brain scan research lab",
          "type": "video",
          "purpose": "fallback"
        },
        {
          "query": "brain science illustration",
          "type": "image",
          "purpose": "fallback"
        }
      ],
      "visualRole": "LITERAL_FOOTAGE",
      "endingIntent": "CTA",
      "duration": 4.5
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
- You must shape the \`assetSearches\` queries based on the chosen \`visualRole\` (e.g., LITERAL_FOOTAGE -> direct real-world footage, ABSTRACT_ANIMATION -> conceptual visuals).
- Do NOT use the same \`visualRole\` more than two scenes in a row. Maintain high visual variety.
- **Pacing & Scene Beats:** Prefer short, fast-paced scenes for Shorts. Most scenes should land around 2–5 seconds unless the concept clearly needs more time. Never exceed 1-2 short sentences per scene. Require scene boundaries to strictly match natural sentence boundaries (no awkward mid-sentence scene cuts).
- **Semantic Density:** If a single beat contains multiple unrelated or highly complex concepts, you MUST split it into two rapid consecutive scenes. If it cannot be split, you must select one overarching abstract thematic visual strategy for the scene, rather than attempting a combined 'frankenstein' query.
- **Closing Scene Intelligence:** For the final scene, explicitly declare the \`endingIntent\` as one of: "CTA", "EMOTIONAL_PAYOFF", "PRACTICAL_ADVICE". Use this intent combined with \`visualRole\` to shape the final asset queries (e.g., an EMOTIONAL_PAYOFF intent paired with an ABSTRACT_ANIMATION visual role). For non-final scenes, omit \`endingIntent\` or leave it null.
- **Anchor Coverage Rule:** You MUST preserve and repeat the 'Required Anchors' across multiple scenes, examples, and visual plans.
- **Forbidden Drift:** You are strictly forbidden from writing about any of the 'Forbidden Drift Topics'.
- **Content Constraints:** You must rigidly follow every rule listed in 'Content Constraints'.
- **SELF-CHECK:** Review the brief. Does the script completely satisfy the core topic and constraints? If not, rewrite.
`.trim();
}
