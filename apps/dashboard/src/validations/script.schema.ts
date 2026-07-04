// File Location: src/validations/script.schema.ts
// Zod validation schema for AI-generated script responses.
// Replaces the manual validateAIResponse() function with type-safe parsing.

import { z } from "zod";
import { AI_DEFAULTS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Stage 1: Creative Brief Schema — validates the initial brief generation
// ---------------------------------------------------------------------------

export const creativeBriefSchema = z.object({
  coreTopic: z.string().min(1, "Core topic is required"),
  audienceContext: z.string().min(1, "Audience context is required"),
  contentAngle: z.string().min(1, "Content angle is required"),
  endingStyle: z.string().min(1, "Ending style is required"),
  requiredAnchors: z.array(z.string()).default([]),
  forbiddenDriftTopics: z.array(z.string()).default([]),
  contentConstraints: z.array(z.string()).default([]),
  visualExpectations: z.string().min(1, "Visual expectations are required"),
  toneGuidance: z.string().min(1, "Tone guidance is required"),
  durationGuidance: z.string().min(1, "Duration guidance is required"),
});

// ---------------------------------------------------------------------------
// Scene schema — validates each scene object from the AI response
// ---------------------------------------------------------------------------

export const sceneSchema = z.object({
  narrationText: z
    .string()
    .min(1, "Narration text is required"),
  visualPrompt: z
    .string()
    .min(1, "Visual prompt is required"),
  visualRole: z
    .enum([
      "LITERAL_FOOTAGE",
      "ABSTRACT_ANIMATION",
      "INFOGRAPHIC",
      "DEMONSTRATION",
      "TRANSITION"
    ])
    .optional(),
  endingIntent: z
    .enum([
      "CTA",
      "EMOTIONAL_PAYOFF",
      "PRACTICAL_ADVICE"
    ])
    .optional(),
  onScreenCaption: z
    .string()
    .default(""),
  searchKeywords: z
    .array(z.string())
    .default([]),
  assetSearches: z
    .array(
      z.object({
        query: z.string(),
        type: z.enum(["video", "image"]),
        purpose: z.string(),
      })
    )
    .default([]),
  duration: z
    .number()
    .positive()
    .default(AI_DEFAULTS.defaultSceneDuration),
});

// ---------------------------------------------------------------------------
// Full script response schema — validates the complete AI output object
// ---------------------------------------------------------------------------

export const scriptResponseSchema = z.object({
  hook: z
    .string()
    .min(1, "Hook is required"),
  bodyText: z
    .string()
    .min(1, "Body text is required"),
  cta: z
    .string()
    .min(1, "CTA is required"),
  metaTitle: z
    .string()
    .min(1, "Meta title is required"),
  metaDescription: z
    .string()
    .min(1, "Meta description is required"),
  estimatedDuration: z
    .number()
    .positive()
    .optional()
    .nullable(),
  scenes: z
    .array(sceneSchema)
    .min(1, "At least one scene is required"),
});

// ---------------------------------------------------------------------------
// Inferred types — use these instead of manual interfaces
// ---------------------------------------------------------------------------

export type ScriptResponse = z.infer<typeof scriptResponseSchema>;
export type SceneInput = z.infer<typeof sceneSchema>;
export type CreativeBrief = z.infer<typeof creativeBriefSchema>;
