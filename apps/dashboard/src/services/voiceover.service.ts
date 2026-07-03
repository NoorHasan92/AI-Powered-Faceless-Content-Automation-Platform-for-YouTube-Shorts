// File Location: src/services/voiceover.service.ts
// Real TTS voiceover generation using Microsoft Edge TTS (msedge-tts).
// Generates actual .mp3 audio files for each scene's narration text.

import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { Voiceover } from "@prisma/client";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";
import path from "path";
import { getAudioDir, toPublicUrl } from "@/lib/audio-utils";

/**
 * Calculate MP3 duration from file size.
 * At 96kbps CBR mono MP3: duration = fileSize / (96000 / 8) = fileSize / 12000
 */
function getMP3Duration(filePath: string): number {
  const stats = fs.statSync(filePath);
  const durationSecs = stats.size / 12000;
  return parseFloat(durationSecs.toFixed(2));
}

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

      // Initialize TTS client (one per scene to avoid websocket issues)
      const tts = new MsEdgeTTS();
      await tts.setMetadata(ttsVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

      // Generate the audio file
      const result = await tts.toFile(sceneDir, scene.narrationText);
      const audioFilePath = result.audioFilePath;

      // Read real duration from file size
      const duration = getMP3Duration(audioFilePath);

      // Convert to public URL
      const publicUrl = toPublicUrl(audioFilePath);

      // Create Voiceover record in DB
      const voiceover = await prisma.voiceover.create({
        data: {
          sceneId: scene.id,
          provider: "msedge-tts",
          voiceId: ttsVoice,
          audioUrl: publicUrl,
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
