// File Location: src/lib/ass-utils.ts
// Helper utility to generate Advanced SubStation Alpha (.ass) subtitle files.
// .ass files provide superior styling, word wrapping, and shadow support compared to basic FFmpeg drawtext.

import fs from "fs";

export interface SubtitleChunk {
  text: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
}

/**
 * Formats a time in seconds to the ASS timestamp format: H:MM:SS.cs
 * e.g., 65.52 -> 0:01:05.52
 */
function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);

  const hh = h.toString();
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  const ccs = cs.toString().padStart(2, "0");

  return `${hh}:${mm}:${ss}.${ccs}`;
}

/**
 * Escapes text for ASS format (newlines become \N)
 */
function escapeAssText(text: string): string {
  return text.replace(/\n/g, "\\N");
}

import { emphasizeText } from "./subtitle-emphasis";

/**
 * Generates an .ass file for a given set of subtitles.
 * Uses a chunky bold font (Montserrat) with an outline and drop shadow for maximum readability.
 * The WrapStyle: 1 and MarginL/MarginR ensure long text wraps cleanly.
 *
 * @param subtitles Array of subtitle chunks with timings
 * @param outputPath Where to save the .ass file
 */
export async function generateAssFile(subtitles: SubtitleChunk[], outputPath: string): Promise<void> {
  // ASS Header config for 1080x1920 (9:16)
  // Font styling: 
  // - Montserrat Bold (-1)
  // - Size 80
  // - White Primary, Black Outline (4px), Black Shadow (3px)
  // - Alignment 2 (Bottom center), with MarginV 350 to sit above YouTube Shorts UI
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 1
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat,80,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,3,2,80,80,350,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = "";
  for (const sub of subtitles) {
    const start = formatAssTime(sub.startTime);
    const end = formatAssTime(sub.endTime);
    // Emphasize first, then escape newlines
    const emphasizedText = emphasizeText(sub.text);
    const text = escapeAssText(emphasizedText);
    events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
  }

  const fileContent = header + events;
  await fs.promises.writeFile(outputPath, fileContent, "utf8");
}
