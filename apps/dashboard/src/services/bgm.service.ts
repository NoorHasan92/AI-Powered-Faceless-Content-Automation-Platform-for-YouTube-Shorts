// File Location: src/services/bgm.service.ts
// Service managing royalty-free background music (BGM) tracks and mixing options.

import path from "path";
import fs from "fs";

export interface BgmOption {
  id: string;
  name: string;
  description: string;
  filename: string;
}

export const BGM_OPTIONS: BgmOption[] = [
  {
    id: "cinematic_documentary",
    name: "Cinematic Documentary",
    description: "Subtle warm harmonic ambient drone for science, history, and explainers",
    filename: "cinematic_documentary.mp3",
  },
  {
    id: "investigative_mystery",
    name: "Investigative Mystery",
    description: "Deep, suspenseful atmospheric pads for true crime, conspiracies, and mysteries",
    filename: "investigative_mystery.mp3",
  },
  {
    id: "dramatic_tension",
    name: "Dramatic Tension",
    description: "Low-frequency atmospheric tension for high-stakes storytelling",
    filename: "dramatic_tension.mp3",
  },
  {
    id: "none",
    name: "None (Voiceover Only)",
    description: "Pure vocal narration with zero background music",
    filename: "",
  },
];

/**
 * Returns the absolute filesystem path for a chosen BGM track.
 */
export function getBgmFilePath(bgmId?: string | null): string | null {
  if (!bgmId || bgmId === "none") return null;

  const option = BGM_OPTIONS.find((b) => b.id === bgmId);
  const filename = option ? option.filename : `${bgmId}.mp3`;
  const bgmPath = path.join(process.cwd(), "apps", "dashboard", "public", "bgm", filename);

  if (fs.existsSync(bgmPath)) {
    return bgmPath;
  }

  // Fallback to relative to process.cwd()
  const fallbackPath = path.join(process.cwd(), "public", "bgm", filename);
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  return null;
}
