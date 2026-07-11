// File Location: src/lib/ffmpeg-utils.ts
// FFmpeg utility functions for video compositing.
// Handles scene composition (image/video + audio + subtitles) and concatenation.

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";

import os from "os";

// Next.js Turbopack corrupts the ffmpeg-static path by prepending \ROOT\
// We must dynamically resolve the absolute path to the binary.
const isWindows = os.platform() === "win32";
const binaryName = isWindows ? "ffmpeg.exe" : "ffmpeg";
const actualFfmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", binaryName);

if (fs.existsSync(actualFfmpegPath)) {
  ffmpeg.setFfmpegPath(actualFfmpegPath);
} else if (ffmpegPath) {
  // Fallback just in case
  ffmpeg.setFfmpegPath(ffmpegPath.replace(/^\\ROOT\\/i, ""));
}

import { generateAssFile } from "./ass-utils";

/**
 * Compose a single scene: background visual + voiceover audio + subtitle text.
 * Output is a 1080x1920 (9:16 portrait) MP4 clip.
 */
export async function composeScene(options: {
  assetPaths: string[];     // Array of paths to background images or a single video
  assetType: string;        // "STOCK_VIDEO" or "STOCK_IMAGE" or "AI_IMAGE"
  audioPath: string;        // Path to voiceover .mp3
  subtitles: { text: string; startTime: number; endTime: number }[]; // Subtitle chunks
  audioDuration: number;    // Duration in seconds
  outputPath: string;       // Where to save the scene clip
}): Promise<void> {
  const { assetPaths, assetType, audioPath, subtitles, audioDuration, outputPath } = options;

  if (!assetPaths || assetPaths.length === 0) {
    throw new Error("No asset paths provided to composeScene.");
  }

  // Generate ASS file for styled subtitles
  const assFilePath = outputPath.replace(".mp4", ".ass");
  let assFilter = "";
  if (subtitles && subtitles.length > 0) {
    await generateAssFile(subtitles, assFilePath);
    const relativeAssPath = path.relative(process.cwd(), assFilePath).replace(/\\/g, "/");
    const escapedAssPath = relativeAssPath.replace(/'/g, "\\'");
    assFilter = `ass='${escapedAssPath}'`;
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    if (assetType !== "AI_IMAGE" || assetPaths.length === 1) {
      // ---------------------------------------------------------
      // SINGLE ASSET PIPELINE (Backwards Compatibility)
      // ---------------------------------------------------------
      const assetPath = assetPaths[0];
      const textFilters = assFilter ? `[bg]${assFilter}[outv]` : `[bg]copy[outv]`;

      if (assetType === "STOCK_VIDEO") {
        command.input(assetPath).inputOptions(["-stream_loop", "-1"]).input(audioPath);
        command.complexFilter([
          `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[bg]`,
          textFilters,
          `[1:a]afade=t=in:st=0:d=0.1,afade=t=out:st=${Math.max(0, audioDuration - 0.2)}:d=0.2[outa]`
        ]);
      } else if (assetType === "AI_IMAGE") {
        command.input(assetPath).input(audioPath);
        const frames = Math.ceil(audioDuration * 30) + 30;
        command.complexFilter([
          `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.001,1.15)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30[bg]`,
          textFilters,
          `[1:a]afade=t=in:st=0:d=0.1,afade=t=out:st=${Math.max(0, audioDuration - 0.2)}:d=0.2[outa]`
        ]);
      } else {
        // STOCK_IMAGE and INFOGRAPHIC
        command.input(assetPath).inputOptions(["-loop", "1"]).input(audioPath);
        command.complexFilter([
          `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[bg]`,
          textFilters,
          `[1:a]afade=t=in:st=0:d=0.1,afade=t=out:st=${Math.max(0, audioDuration - 0.2)}:d=0.2[outa]`
        ]);
      }

      command.outputOptions([
        "-map", "[outv]", "-map", "[outa]",
        "-t", String(audioDuration),
        "-c:v", "libx264", "-preset", "fast",
        "-b:v", "8M", "-maxrate", "8M", "-bufsize", "16M",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p", "-shortest",
      ]);

    } else if (assetType === "AI_IMAGE" && assetPaths.length > 1) {
      // ---------------------------------------------------------
      // MULTI-IMAGE CINEMATIC SLIDESHOW PIPELINE
      // ---------------------------------------------------------
      const N = assetPaths.length;
      for (const p of assetPaths) {
        command.input(p);
      }
      command.input(audioPath); // Audio is input index N

      const fadeDuration = 0.4;
      const totalRawDurationNeeded = audioDuration + (N - 1) * fadeDuration;
      
      // Weighted duration allocation: first image gets slightly more time to establish
      let allocatedDurations: number[] = [];
      if (N === 2) {
        allocatedDurations = [totalRawDurationNeeded * 0.55, totalRawDurationNeeded * 0.45];
      } else if (N === 3) {
        allocatedDurations = [totalRawDurationNeeded * 0.4, totalRawDurationNeeded * 0.3, totalRawDurationNeeded * 0.3];
      } else {
        allocatedDurations = [totalRawDurationNeeded * 0.35, totalRawDurationNeeded * 0.25, totalRawDurationNeeded * 0.2, totalRawDurationNeeded * 0.2];
      }

      const filterSegments: string[] = [];
      const offsets: number[] = [];
      let currentOffset = 0;

      for (let i = 0; i < N; i++) {
        const dur = allocatedDurations[i];
        const frames = Math.ceil(dur * 30) + 15; // padding for smooth transition

        // Expanded Ken Burns Motion Presets
        let kb = "";
        switch (i % 4) {
          case 0: // Zoom In, center
            kb = `zoompan=z='min(zoom+0.0015,1.15)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
            break;
          case 1: // Pan Right (start zoomed)
            kb = `zoompan=z='1.15':d=${frames}:x='iw/2-(iw/zoom/2)+on*0.8':y='ih/2-(ih/zoom/2)'`;
            break;
          case 2: // Diagonal Pan Up-Left (start zoomed)
            kb = `zoompan=z='1.15':d=${frames}:x='iw/2-(iw/zoom/2)-on*0.6':y='ih/2-(ih/zoom/2)-on*0.6'`;
            break;
          case 3: // Pan Down (start zoomed)
            kb = `zoompan=z='1.15':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+on*0.8'`;
            break;
        }

        filterSegments.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${kb}:s=1080x1920:fps=30[v${i}]`);
        
        if (i > 0) {
          offsets.push(currentOffset);
        }
        currentOffset += dur - fadeDuration;
      }

      // Chain xfade transitions
      let lastOut = `[v0]`;
      for (let i = 1; i < N; i++) {
        const nextIn = `[v${i}]`;
        const outName = i === N - 1 ? `[bg_pre]` : `[xf${i}]`;
        filterSegments.push(`${lastOut}${nextIn}xfade=transition=fade:duration=${fadeDuration}:offset=${offsets[i - 1].toFixed(3)}${outName}`);
        lastOut = outName;
      }

      // Apply text filters to the final merged background
      const textFilters = assFilter ? `[bg_pre]${assFilter}[outv]` : `[bg_pre]copy[outv]`;
      filterSegments.push(textFilters);
      
      // Audio fade
      filterSegments.push(`[${N}:a]afade=t=in:st=0:d=0.1,afade=t=out:st=${Math.max(0, audioDuration - 0.2).toFixed(3)}:d=0.2[outa]`);

      command.complexFilter(filterSegments);

      command.outputOptions([
        "-map", "[outv]", "-map", "[outa]",
        "-t", String(audioDuration),
        "-c:v", "libx264", "-preset", "fast",
        "-b:v", "8M", "-maxrate", "8M", "-bufsize", "16M",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p", "-shortest",
      ]);
    }

    command
      .output(outputPath)
      .on("start", (cmdline) => {
        console.log(`[FFmpeg] Spawned for ${assetType} scene: ${cmdline}`);
      })
      .on("end", () => resolve())
      .on("error", (err) => reject(new Error(`FFmpeg scene error: ${err.message}`)))
      .run();
  });
}

/**
 * Concatenate multiple scene clips into one final video.
 */
export function concatenateScenes(scenePaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Write a concat list file for FFmpeg
    const listPath = outputPath.replace(".mp4", "_list.txt");
    const listContent = scenePaths.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    fs.writeFileSync(listPath, listContent);

    ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions([
        "-c", "copy", // No re-encoding since all scenes share the same codec settings
      ])
      .output(outputPath)
      .on("end", () => {
        // Clean up the list file
        try { fs.unlinkSync(listPath); } catch { /* ignore */ }
        resolve();
      })
      .on("error", (err) => reject(new Error(`FFmpeg concat error: ${err.message}`)))
      .run();
  });
}

/**
 * Escape special characters for FFmpeg drawtext filter.
 */
function escapeFfmpegText(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\u2019")  // Replace apostrophe with unicode right single quote
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "%%")
    .replace(/\n/g, " ");
}
