// File Location: src/services/ai/prompts.ts
// Prompt templates for AI content generation.
// Centralized here so prompts can be versioned, tested, and swapped independently.

import { AI_DEFAULTS } from "@/lib/constants";

/**
 * Builds the script generation prompt for Gemini.
 * The output shape must match scriptResponseSchema in validations/script.schema.ts.
 */
export function buildScriptPrompt(niche: string, tone: string, targetDuration: string, recentTopics: string = ""): string {
  const avoidanceRule = recentTopics 
    ? `- IMPORTANT: Do NOT generate ideas, facts, or scripts related to any of these recently generated topics: ${recentTopics}. Pick a completely different idea.`
    : "";

  return `
You are an expert short-form video scriptwriter and director.
Create a highly engaging, viral-style script for a YouTube Short.

Topic/Niche: ${niche}
Tone: ${tone}
Target Duration: ${targetDuration}

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
      "duration": 4.5
    }
  ]
}

Rules:
${avoidanceRule}
- IMPORTANT: The sum of all scene \`duration\` values MUST closely match the Target Duration (${targetDuration}). 
- Do NOT hardcode the scene count. Scale the number of scenes up or down dynamically to fit the Target Duration perfectly (e.g. longer durations require more scenes, shorter durations require fewer scenes).
- Ensure the visualPrompts are highly descriptive for an AI image/video generator.
- The \`duration\` should be an estimated time in seconds to speak the narration text for that specific scene.
- \`estimatedDuration\` should be the mathematical sum of all scene durations.
- \`searchKeywords\` should be 2-4 broad relevant terms (light semantic tags).
- \`assetSearches\` must be an ordered array of 3 specific asset retrieval queries, from highly specific to broad fallback. Valid types are "video" or "image".
`.trim();
}
