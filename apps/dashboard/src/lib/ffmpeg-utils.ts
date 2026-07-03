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

/**
 * Compose a single scene: background visual + voiceover audio + subtitle text.
 * Output is a 1080x1920 (9:16 portrait) MP4 clip.
 */
export function composeScene(options: {
  assetPath: string;        // Path to background image or video
  assetType: string;        // "STOCK_VIDEO" or "STOCK_IMAGE"
  audioPath: string;        // Path to voiceover .mp3
  subtitleText: string;     // On-screen caption text
  audioDuration: number;    // Duration in seconds
  outputPath: string;       // Where to save the scene clip
}): Promise<void> {
  const { assetPath, assetType, audioPath, subtitleText, audioDuration, outputPath } = options;

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    if (assetType === "STOCK_VIDEO") {
      // Video asset: scale to fill 1080x1920, loop if shorter than audio
      command
        .input(assetPath)
        .inputOptions(["-stream_loop", "-1"]) // loop video if too short
        .input(audioPath);

      command
        .complexFilter([
          // Scale, crop to 1080x1920, and force 30fps for smooth video
          `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[bg]`,
          // Draw subtitle text
          `[bg]drawtext=text='${escapeFfmpegText(subtitleText)}':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-h/4:font=Arial[outv]`,
          // Smooth audio fade in/out to remove harsh audio cuts
          `[1:a]afade=t=in:st=0:d=0.1,afade=t=out:st=${Math.max(0, audioDuration - 0.2)}:d=0.2[outa]`
        ])
        .outputOptions([
          "-map", "[outv]",
          "-map", "[outa]",
          "-t", String(audioDuration),
          "-c:v", "libx264",
          "-preset", "fast",
          "-b:v", "8M",
          "-maxrate", "8M",
          "-bufsize", "16M",
          "-c:a", "aac",
          "-b:a", "192k",
          "-pix_fmt", "yuv420p",
          "-shortest",
        ]);
    } else {
      // Image asset: create a video from a still image with audio
      command
        .input(assetPath)
        .inputOptions(["-loop", "1"]) // loop the image
        .input(audioPath);

      command
        .complexFilter([
          // Scale, crop to 1080x1920, and force 30fps
          `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[bg]`,
          // Draw subtitle text
          `[bg]drawtext=text='${escapeFfmpegText(subtitleText)}':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-h/4:font=Arial[outv]`,
          // Smooth audio fade in/out
          `[1:a]afade=t=in:st=0:d=0.1,afade=t=out:st=${Math.max(0, audioDuration - 0.2)}:d=0.2[outa]`
        ])
        .outputOptions([
          "-map", "[outv]",
          "-map", "[outa]",
          "-t", String(audioDuration),
          "-c:v", "libx264",
          "-preset", "fast",
          "-b:v", "8M",
          "-maxrate", "8M",
          "-bufsize", "16M",
          "-c:a", "aac",
          "-b:a", "192k",
          "-pix_fmt", "yuv420p",
          "-shortest",
        ]);
    }

    command
      .output(outputPath)
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
