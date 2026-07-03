// File Location: src/services/ai/gemini.ts
// Gemini AI client singleton and structured content generation utility.
// Extracted from the old [id]/actions.ts to be reusable across modules.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_DEFAULTS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Singleton client — initialized once, reused across all service calls
// ---------------------------------------------------------------------------

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ---------------------------------------------------------------------------
// Model configuration with robust fallback architecture
// ---------------------------------------------------------------------------
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite", // Primary
  "gemini-3.5-flash",      // Backup 1
  "gemini-2.5-flash-lite", // Backup 2
  "gemini-2.5-flash"       // Backup 3
];

/**
 * Returns a Gemini model configured for structured JSON output.
 * @param modelName The specific model string to instantiate
 */
export function getStructuredModel(modelName: string = AI_DEFAULTS.model) {
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: AI_DEFAULTS.responseMimeType,
    },
  });
}

/**
 * Sends a prompt to Gemini and returns the raw parsed JSON.
 * Automatically tries fallback models if a quota (429) or availability error occurs.
 */
export async function generateStructuredContent(prompt: string): Promise<unknown> {
  let lastError: any = null;

  for (const currentModel of FALLBACK_MODELS) {
    try {
      console.log(`[AI] Attempting generation with model: ${currentModel}`);
      const model = getStructuredModel(currentModel);
      const result = await model.generateContent(prompt);
      
      const responseText = result.response.text();
      console.log(`[AI] Successfully generated content using ${currentModel}`);
      
      return JSON.parse(responseText);
    } catch (error: any) {
      console.warn(`[AI] Model ${currentModel} failed:`, error?.message || error);
      lastError = error;
      // Continue to the next fallback model in the loop
    }
  }

  console.error("[AI] All fallback models failed.");
  throw lastError || new Error("Failed to generate content with any available AI models.");
}
