// File Location: src/lib/audio-utils.ts
// Utility functions for audio file handling and directory management.
// Used by the voiceover service to store and manage TTS output files.

import fs from "fs";
import path from "path";

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get the base output directory for pipeline artifacts.
 * Uses `public/pipeline/` so files are servable by Next.js.
 */
export function getPipelineDir(): string {
  return path.join(process.cwd(), "public", "pipeline");
}

/**
 * Get the audio output directory for a specific project.
 */
export function getAudioDir(projectId: string): string {
  const dir = path.join(getPipelineDir(), projectId, "audio");
  ensureDir(dir);
  return dir;
}

/**
 * Get the assets output directory for a specific project.
 */
export function getAssetsDir(projectId: string): string {
  const dir = path.join(getPipelineDir(), projectId, "assets");
  ensureDir(dir);
  return dir;
}

/**
 * Get the exports output directory for a specific project.
 */
export function getExportsDir(projectId: string): string {
  const dir = path.join(getPipelineDir(), projectId, "exports");
  ensureDir(dir);
  return dir;
}

/**
 * Convert an absolute file path to a URL path servable by Next.js.
 * e.g., C:\...\public\pipeline\abc\audio\scene-0.mp3 → /pipeline/abc/audio/scene-0.mp3
 */
export function toPublicUrl(absolutePath: string): string {
  const publicDir = path.join(process.cwd(), "public");
  const relative = path.relative(publicDir, absolutePath).replace(/\\/g, "/");
  return `/${relative}`;
}

/**
 * Clean up all pipeline artifacts for a project.
 */
export function cleanProjectArtifacts(projectId: string): void {
  const dir = path.join(getPipelineDir(), projectId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
