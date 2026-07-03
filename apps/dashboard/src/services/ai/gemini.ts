// File Location: src/services/ai/gemini.ts
// Gemini AI client singleton and structured content generation utility.
// Extracted from the old [id]/actions.ts to be reusable across modules.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_DEFAULTS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Singleton client — initialized once, reused across all service calls
// ---------------------------------------------------------------------------

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Returns a Gemini model configured for structured JSON output.
 * All AI generation in the pipeline should go through this function.
 */
export function getStructuredModel() {
  return genAI.getGenerativeModel({
    model: AI_DEFAULTS.model,
    generationConfig: {
      responseMimeType: AI_DEFAULTS.responseMimeType,
    },
  });
}

/**
 * Sends a prompt to Gemini and returns the raw parsed JSON.
 * The caller is responsible for validating the shape with Zod.
 */
export async function generateStructuredContent(prompt: string): Promise<unknown> {
  const model = getStructuredModel();
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  return JSON.parse(responseText);
}
