// File Location: src/validations/project.schema.ts
// Zod validation schema for project creation input.
// Used in project.actions.ts to validate form data before database writes.

import { z } from "zod";

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, "Project title is required")
    .max(200, "Title must be under 200 characters")
    .trim(),
  niche: z
    .string()
    .min(1, "Content niche is required"),
  tone: z
    .string()
    .min(1, "Narration tone is required"),
  targetDuration: z
    .string()
    .min(1, "Target duration is required"),
  videoFormat: z
    .enum(["SHORTS", "LONG_FORM"])
    .default("SHORTS"),
  aspectRatio: z
    .enum(["9:16", "16:9"])
    .default("9:16"),
  subtopics: z
    .array(z.string())
    .default([]),
  voice: z
    .string()
    .min(1, "Voice selection is required"),
  bgmTrack: z
    .string()
    .optional(),
  specificTopic: z
    .string()
    .optional(),
  creatorInstructions: z
    .string()
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
