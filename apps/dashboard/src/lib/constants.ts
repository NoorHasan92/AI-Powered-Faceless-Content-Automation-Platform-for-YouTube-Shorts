// File Location: src/lib/constants.ts
// Centralized constants for the ShortForge pipeline.
// Niche/tone options, status display config, and shared defaults.

import type { StatusConfig } from "./types";

// ---------------------------------------------------------------------------
// Content niche options — used in project creation forms and AI prompts
// ---------------------------------------------------------------------------

export const NICHE_OPTIONS = [
  { value: "science", label: "Weird Science Facts" },
  { value: "animals", label: "Animal Psychology" },
  { value: "finance", label: "Money & Finance Secrets" },
  { value: "history", label: "Untold History Stories" },
  { value: "psychology", label: "Psychology & Human Behavior" },
  { value: "productivity", label: "Productivity & Learning" },
] as const;

// ---------------------------------------------------------------------------
// Narration tone options — controls AI script voice and style
// ---------------------------------------------------------------------------

export const TONE_OPTIONS = [
  { value: "educational", label: "Educational & Clear" },
  { value: "dramatic", label: "Dramatic & Cinematic" },
  { value: "casual", label: "Casual & Conversational" },
] as const;

// ---------------------------------------------------------------------------
// Project status display config — maps enum values to UI labels and colors
// Uses current Prisma enum values; will be updated in Step 3 migration.
// ---------------------------------------------------------------------------

export const PROJECT_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  },
  GENERATING_SCRIPT: {
    label: "Generating Script",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  SCRIPT_READY: {
    label: "Script Ready",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  IN_PRODUCTION: {
    label: "In Production",
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
  EXPORT_QUEUED: {
    label: "Export Queued",
    className: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200",
  },
  EXPORTING: {
    label: "Exporting",
    className: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
};

// ---------------------------------------------------------------------------
// AI generation defaults
// ---------------------------------------------------------------------------

export const AI_DEFAULTS = {
  model: "gemini-3.1-flash-lite",
  minScenes: 4,
  maxScenes: 6,
  defaultSceneDuration: 4.0,
  responseMimeType: "application/json" as const,
} as const;

// ---------------------------------------------------------------------------
// Export defaults
// ---------------------------------------------------------------------------

export const EXPORT_DEFAULTS = {
  resolution: "1080x1920",
  format: "mp4",
} as const;
