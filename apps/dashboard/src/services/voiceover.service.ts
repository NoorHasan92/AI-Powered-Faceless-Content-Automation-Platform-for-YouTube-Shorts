// File Location: src/services/voiceover.service.ts
// Real TTS voiceover generation using Microsoft Edge TTS (msedge-tts).
// Generates actual .mp3 audio files for each scene's narration text with robust retries,
// socket lifecycle management, metadata fallbacks, and incremental generation.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { Voiceover } from "@prisma/client";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";
import path from "path";
import { getAudioDir } from "@/lib/audio-utils";
import { uploadAudioToCloudinary } from "@/lib/cloudinary-upload";
import mp3Duration from "mp3-duration";

/**
 * Synthesizes speech for a single scene with socket lifecycle cleanup,
 * exponential jitter backoff, and automatic fallback to audio-only if metadata drops.
 */
async function synthesizeSceneTts(
  sceneDir: string,
  text: string,
  ttsVoice: string,
  sceneIndex: number
): Promise<{ audioFilePath: string; wordTimings: any[] }> {
  const targetAudioFile = path.join(sceneDir, "audio.mp3");
  const maxRetries = 4;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let tts: MsEdgeTTS | null = null;
    let fileWriteStream: fs.WriteStream | null = null;
    // On attempts 1 & 2: attempt high-precision word boundary metadata
    // On attempts 3 & 4: fallback to audio-only (vastly reduces websocket payload and prevents turn.end drops)
    const enableWordBoundary = attempt <= 2;

    try {
      tts = new MsEdgeTTS({
        connectionTimeoutMs: 15000,
        synthesisTimeoutMs: 40000,
      });

      await tts.setMetadata(ttsVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
        wordBoundaryEnabled: enableWordBoundary,
      });

      const wordTimings: { word: string; start: number; end: number; duration: number }[] = [];
      fileWriteStream = fs.createWriteStream(targetAudioFile);

      const { audioStream, metadataStream } = tts.toStream(text);

      if (metadataStream && enableWordBoundary) {
        metadataStream.on("data", (chunk: Buffer) => {
          try {
            const parsed = JSON.parse(chunk.toString("utf8"));
            for (const item of parsed.Metadata || []) {
              if (item.Type === "WordBoundary") {
                const start = parseFloat((item.Data.Offset / 10000000).toFixed(3));
                const dur = parseFloat((item.Data.Duration / 10000000).toFixed(3));
                const end = parseFloat((start + dur).toFixed(3));
                wordTimings.push({
                  word: item.Data.text.Text,
                  start,
                  end,
                  duration: dur,
                });
              }
            }
          } catch {}
        });
      }

      await new Promise<void>((resolve, reject) => {
        audioStream.pipe(fileWriteStream!);
        audioStream.on("error", (err) => {
          reject(err);
        });
        fileWriteStream!.on("finish", () => {
          resolve();
        });
        fileWriteStream!.on("error", (err) => {
          reject(err);
        });
      });

      // Verify file exists and has actual audio data
      if (!fs.existsSync(targetAudioFile) || fs.statSync(targetAudioFile).size === 0) {
        throw new Error("Generated audio file is empty or missing");
      }

      // Persist word timings if captured
      if (wordTimings.length > 0) {
        fs.writeFileSync(
          path.join(sceneDir, "words.json"),
          JSON.stringify(wordTimings, null, 2),
          "utf8"
        );
      }

      return { audioFilePath: targetAudioFile, wordTimings };
    } catch (err) {
      lastError = err;
      console.warn(
        `[VoiceoverService] TTS attempt ${attempt}/${maxRetries} failed for scene ${sceneIndex} (wordBoundary=${enableWordBoundary}):`,
        err instanceof Error ? err.message : err
      );

      // Clean up partial corrupted audio file on disk
      try {
        if (fileWriteStream) fileWriteStream.destroy();
        if (fs.existsSync(targetAudioFile)) fs.unlinkSync(targetAudioFile);
      } catch {}

      if (attempt < maxRetries) {
        // Backoff with randomized jitter to prevent thundering herd against Edge TTS
        const backoffMs = 1200 * attempt + Math.floor(Math.random() * 600);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    } finally {
      // Explicitly close the WebSocket to prevent socket leaks and throttling
      try {
        if (tts) tts.close();
      } catch {}
    }
  }

  throw new Error(
    `Failed to generate TTS for scene ${sceneIndex} after ${maxRetries} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Generate TTS audio for a single specific scene.
 */
export async function generateSingleVoiceover(
  projectId: string,
  sceneId: string
): Promise<ServiceResult<Voiceover>> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { voice: true },
    });
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    const ttsVoice = project?.voice || "en-US-AvaMultilingualNeural";
    const audioDir = getAudioDir(projectId);
    const sceneDir = path.join(audioDir, `scene-${scene.sceneIndex}`);
    if (!fs.existsSync(sceneDir)) {
      fs.mkdirSync(sceneDir, { recursive: true });
    }

    const { audioFilePath, wordTimings } = await synthesizeSceneTts(
      sceneDir,
      scene.narrationText,
      ttsVoice,
      scene.sceneIndex
    );

    const duration: number = await new Promise((resolve, reject) => {
      mp3Duration(audioFilePath, (err, dur) => {
        if (err) return reject(err);
        resolve(parseFloat(dur.toFixed(2)));
      });
    });

    let audioUrl = `/pipeline/${projectId}/audio/scene-${scene.sceneIndex}/audio.mp3`;
    try {
      const upload = await uploadAudioToCloudinary(audioFilePath, projectId, scene.sceneIndex);
      if (upload?.secure_url) audioUrl = upload.secure_url;
    } catch (uploadErr) {
      console.warn(`[VoiceoverService] Cloudinary audio upload failed for scene ${scene.sceneIndex}, falling back to local:`, uploadErr);
    }

    // Delete previous voiceover record for this scene
    await prisma.voiceover.deleteMany({
      where: { sceneId: scene.id },
    });

    const voiceover = await prisma.voiceover.create({
      data: {
        sceneId: scene.id,
        provider: "msedge-tts",
        voiceId: ttsVoice,
        audioUrl,
        localPath: audioFilePath,
        duration,
        wordTimings: wordTimings as any,
        status: "COMPLETED",
      },
    });

    await prisma.scene.update({
      where: { id: scene.id },
      data: { duration },
    });

    return { success: true, data: voiceover };
  } catch (err: any) {
    console.error(`[VoiceoverService] Single voiceover generation failed for scene ${sceneId}:`, err);
    return { success: false, error: err?.message || "Failed to generate single voiceover" };
  }
}

/**
 * Generate real TTS audio for scenes in a project.
 * Supports incremental generation (skips already completed scenes unless forceRegenerate is true).
 */
export async function generateVoiceovers(
  projectId: string,
  forceRegenerate = false
): Promise<ServiceResult<Voiceover[]>> {
  try {
    const script = await prisma.script.findUnique({
      where: { projectId },
      include: {
        scenes: {
          include: { voiceover: true },
          orderBy: { sceneIndex: "asc" },
        },
        project: true,
      },
    });

    if (!script || script.scenes.length === 0) {
      throw new Error("No script or scenes found to generate voiceovers for.");
    }

    const ttsVoice = script.project.voice || "en-US-AvaMultilingualNeural";

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "IN_PRODUCTION" },
    });

    // If forceRegenerate is true, clear all existing voiceovers
    if (forceRegenerate) {
      const sceneIds = script.scenes.map((s) => s.id);
      await prisma.voiceover.deleteMany({
        where: { sceneId: { in: sceneIds } },
      });
    }

    const audioDir = getAudioDir(projectId);
    const voiceovers: Voiceover[] = [];

    for (const scene of script.scenes) {
      // Check if already completed and valid
      if (
        !forceRegenerate &&
        scene.voiceover &&
        scene.voiceover.status === "COMPLETED" &&
        (scene.voiceover.duration ?? 0) > 0 &&
        scene.voiceover.audioUrl
      ) {
        console.log(`[VoiceoverService] Scene ${scene.sceneIndex + 1} already has completed voiceover. Preserving.`);
        voiceovers.push(scene.voiceover);
        continue;
      }

      const sceneDir = path.join(audioDir, `scene-${scene.sceneIndex}`);
      if (!fs.existsSync(sceneDir)) {
        fs.mkdirSync(sceneDir, { recursive: true });
      }

      console.log(`[VoiceoverService] Synthesizing audio for scene ${scene.sceneIndex + 1}/${script.scenes.length}...`);

      const { audioFilePath, wordTimings } = await synthesizeSceneTts(
        sceneDir,
        scene.narrationText,
        ttsVoice,
        scene.sceneIndex
      );

      const duration: number = await new Promise((resolve, reject) => {
        mp3Duration(audioFilePath, (err, dur) => {
          if (err) return reject(err);
          resolve(parseFloat(dur.toFixed(2)));
        });
      });

      let audioUrl = `/pipeline/${projectId}/audio/scene-${scene.sceneIndex}/audio.mp3`;
      try {
        const upload = await uploadAudioToCloudinary(audioFilePath, projectId, scene.sceneIndex);
        if (upload?.secure_url) audioUrl = upload.secure_url;
      } catch (uploadErr) {
        console.warn(`[VoiceoverService] Cloudinary audio upload failed for scene ${scene.sceneIndex}, using local:`, uploadErr);
      }

      // Remove any prior entry for this scene
      await prisma.voiceover.deleteMany({
        where: { sceneId: scene.id },
      });

      const voiceover = await prisma.voiceover.create({
        data: {
          sceneId: scene.id,
          provider: "msedge-tts",
          voiceId: ttsVoice,
          audioUrl,
          localPath: audioFilePath,
          duration,
          wordTimings: wordTimings as any,
          status: "COMPLETED",
        },
      });

      await prisma.scene.update({
        where: { id: scene.id },
        data: { duration },
      });

      voiceovers.push(voiceover);

      // Brief gentle pause between scenes to prevent rate-limiting on Edge TTS
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    return { success: true, data: voiceovers };
  } catch (error) {
    console.error("Voiceover generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate voiceovers",
    };
  }
}
