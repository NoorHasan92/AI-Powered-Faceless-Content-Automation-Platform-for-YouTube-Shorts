// File Location: src/lib/types.ts
// Shared TypeScript types used across services, actions, and components.
// These are the canonical type definitions for the ShortForge pipeline.

// ---------------------------------------------------------------------------
// Service result wrapper — standardized return type for all service functions
// ---------------------------------------------------------------------------

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// Project types
// ---------------------------------------------------------------------------

export interface CreateProjectInput {
  title: string;
  niche: string;
  tone: string;
  targetDuration: string;
  voice: string;
  specificTopic?: string;
  creatorInstructions?: string;
}

// ---------------------------------------------------------------------------
// Script / Scene types — represents validated AI output
// ---------------------------------------------------------------------------

export interface SceneData {
  narrationText: string;
  visualPrompt: string;
  onScreenCaption: string;
  searchKeywords: string[];
  duration: number;
}

export interface ScriptGenerationResult {
  hook: string;
  bodyText: string;
  cta: string;
  metaTitle: string;
  metaDescription: string;
  estimatedDuration: number | null;
  scenes: SceneData[];
}

// ---------------------------------------------------------------------------
// Export types
// ---------------------------------------------------------------------------

export interface ExportJobInput {
  projectId: string;
  resolution?: string;
  format?: string;
}

// ---------------------------------------------------------------------------
// Status display helpers
// ---------------------------------------------------------------------------

export interface StatusConfig {
  label: string;
  className: string;
}
