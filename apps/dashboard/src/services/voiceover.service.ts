// File Location: src/services/voiceover.service.ts
// Real TTS voiceover generation using Microsoft Edge TTS (msedge-tts).
// Generates actual .mp3 audio files for each scene's narration text.

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
 * Generate real TTS audio for all scenes in a project.
 *
 * Flow:
 * 1. Fetch script + scenes from DB
 * 2. Clear any existing voiceover records (retry support)
 * 3. For each scene: call Edge TTS → save .mp3 → read duration
 * 4. Create Voiceover records with real audio paths and durations
 */
export async function generateVoiceovers(projectId: string): Promise<ServiceResult<Voiceover[]>> {
  try {
    // 1. Get the script and scenes
    const script = await prisma.script.findUnique({
      where: { projectId },
      include: { scenes: true, project: true },
    });

    if (!script || script.scenes.length === 0) {
      throw new Error("No script or scenes found to generate voiceovers for.");
    }
    
    const ttsVoice = script.project.voice || "en-US-AvaMultilingualNeural";

    // 2. Mark project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "IN_PRODUCTION" },
    });

    // 3. Clear existing voiceovers for this project's scenes (retry support)
    const sceneIds = script.scenes.map(s => s.id);
    await prisma.voiceover.deleteMany({
      where: { sceneId: { in: sceneIds } },
    });

    // 4. Prepare output directory
    const audioDir = getAudioDir(projectId);

    // 5. Generate real TTS audio for each scene
    const voiceovers: Voiceover[] = [];

    for (const scene of script.scenes.sort((a, b) => a.sceneIndex - b.sceneIndex)) {
      // Create a subdirectory per scene (msedge-tts outputs "audio.mp3" in the dir)
      const sceneDir = path.join(audioDir, `scene-${scene.sceneIndex}`);
      if (!fs.existsSync(sceneDir)) {
        fs.mkdirSync(sceneDir, { recursive: true });
      }

      // Clean up any stale audio file from previous failed attempts
      const staleAudioFile = path.join(sceneDir, "audio.mp3");
      try {
        if (fs.existsSync(staleAudioFile)) {
          fs.unlinkSync(staleAudioFile);
        }
      } catch {
        /* ignore */
      }

      // Generate audio with retry to handle transient Edge TTS WebSocket closures
      let audioFilePath = "";
      let lastError: unknown = null;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const tts = new MsEdgeTTS();
          await tts.setMetadata(ttsVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
          const result = await tts.toFile(sceneDir, scene.narrationText);
          audioFilePath = result.audioFilePath;
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`[VoiceoverService] TTS attempt ${attempt}/${maxRetries} failed for scene ${scene.sceneIndex}:`, err);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!audioFilePath || lastError) {
        throw new Error(
          `Failed to generate TTS for scene ${scene.sceneIndex} after ${maxRetries} attempts: ${
            lastError instanceof Error ? lastError.message : String(lastError)
          }`
        );
      }

      // Read real exact duration using mp3-duration parser
      const duration: number = await new Promise((resolve, reject) => {
        mp3Duration(audioFilePath, (err, dur) => {
          if (err) return reject(err);
          resolve(parseFloat(dur.toFixed(2)));
        });
      });

      // Upload to Cloudinary with fallback to local path if Cloudinary fails
      let audioUrl = `/pipeline/${projectId}/audio/scene-${scene.sceneIndex}/audio.mp3`;
      try {
        const upload = await uploadAudioToCloudinary(audioFilePath, projectId, scene.sceneIndex);
        audioUrl = upload.secure_url;
      } catch (uploadErr) {
        console.warn(`[VoiceoverService] Cloudinary audio upload failed for scene ${scene.sceneIndex}, falling back to local URL:`, uploadErr);
      }

      // Create Voiceover record in DB
      const voiceover = await prisma.voiceover.create({
        data: {
          sceneId: scene.id,
          provider: "msedge-tts",
          voiceId: ttsVoice,
          audioUrl,
          localPath: audioFilePath,
          duration,
          status: "COMPLETED",
        },
      });

      // Update scene duration to match actual audio duration
      await prisma.scene.update({
        where: { id: scene.id },
        data: { duration },
      });

      voiceovers.push(voiceover);

      // Brief backoff between scenes to prevent rate-limiting on Edge TTS WebSocket
      await new Promise((resolve) => setTimeout(resolve, 500));
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
