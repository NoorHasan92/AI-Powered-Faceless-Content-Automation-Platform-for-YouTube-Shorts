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
 * Defaults to `/var/tars-data`, or `/tmp/tars-data` if permissions restrict `/var`.
 */
export function getPipelineDir(): string {
  if (process.env.DATA_DIR) {
    ensureDir(process.env.DATA_DIR);
    return process.env.DATA_DIR;
  }
  try {
    const dir = process.platform === "win32" ? "C:\\var\\tars-data" : "/tmp/tars-data";
    ensureDir(dir);
    return dir;
  } catch {
    const fallbackDir = path.join(process.cwd(), "tmp_data");
    ensureDir(fallbackDir);
    return fallbackDir;
  }
}

/**
 * Get the project-specific base pipeline directory.
 */
export function getProjectPipelineDir(projectId: string): string {
  const dir = path.join(getPipelineDir(), projectId);
  ensureDir(dir);
  return dir;
}

/**
 * Get the audio output directory for a specific project.
 */
export function getAudioDir(projectId: string): string {
  const dir = path.join(getProjectPipelineDir(projectId), "audio");
  ensureDir(dir);
  return dir;
}

/**
 * Get the assets output directory for a specific project.
 */
export function getAssetsDir(projectId: string): string {
  const dir = path.join(getProjectPipelineDir(projectId), "assets");
  ensureDir(dir);
  return dir;
}

/**
 * Get the exports output directory for a specific project.
 */
export function getExportsDir(projectId: string): string {
  const dir = path.join(getProjectPipelineDir(projectId), "exports");
  ensureDir(dir);
  return dir;
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
