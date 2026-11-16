// File Location: src/services/subtitle.service.ts
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { SubtitleChunk } from "@prisma/client";

/**
 * Generate subtitle chunks by splitting scene narration text.
 * 
 * Phase 1 Placeholder: This naively splits the narration by punctuation
 * or fixed word counts. In Phase 2+, this would use forced alignment
 * with the generated audio (e.g., Whisper API or exact timing data).
 */
export async function generateSubtitles(projectId: string): Promise<ServiceResult<SubtitleChunk[]>> {
  try {
    // 1. Get the script and scenes with voiceover telemetry
    const script = await prisma.script.findUnique({
      where: { projectId },
      include: {
        scenes: {
          include: { voiceover: true },
          orderBy: { sceneIndex: "asc" },
        },
      },
    });

    if (!script || script.scenes.length === 0) {
      throw new Error("No script or scenes found to generate subtitles for.");
    }

    // 2. Clear existing subtitles for this project's scenes (retry support)
    const sceneIds = script.scenes.map(s => s.id);
    await prisma.subtitleChunk.deleteMany({
      where: { sceneId: { in: sceneIds } },
    });

    // 3. Generate high-precision synchronized subtitle chunks
    const chunks: any[] = [];
    
    script.scenes.forEach(scene => {
      interface WordTiming {
        word: string;
        start: number;
        end: number;
        duration: number;
      }

      const wordList: WordTiming[] = (scene.voiceover?.wordTimings as unknown as WordTiming[]) || [];

      if (wordList.length > 0) {
        // GROUND-TRUTH TELEMETRY: Build chunks from Edge TTS word boundary events
        let currentGroup: WordTiming[] = [];

        for (let i = 0; i < wordList.length; i++) {
          const w = wordList[i];
          const prevW = currentGroup[currentGroup.length - 1];

          // Natural speech pause (> 0.4s silence): close previous chunk so subtitle does not linger during silence
          if (prevW && (w.start - prevW.end) > 0.4 && currentGroup.length > 0) {
            chunks.push({
              sceneId: scene.id,
              text: currentGroup.map(item => item.word).join(" "),
              startTime: currentGroup[0].start,
              endTime: prevW.end,
              style: "default",
            });
            currentGroup = [];
          }

          currentGroup.push(w);

          // Close chunk on punctuation, 4 words, or last word in scene
          const hasPunctuation = /[.,!?;:]$/.test(w.word);
          const reachedLength = currentGroup.length >= 4;
          const isLast = i === wordList.length - 1;

          if (hasPunctuation || reachedLength || isLast) {
            chunks.push({
              sceneId: scene.id,
              text: currentGroup.map(item => item.word).join(" "),
              startTime: currentGroup[0].start,
              endTime: w.end,
              style: "default",
            });
            currentGroup = [];
          }
        }
      } else {
        // Fallback: proportional calculation if scene lacked word boundary telemetry
        const words = scene.narrationText.split(" ").filter(w => w.trim().length > 0);
        let currentChunk: string[] = [];
        let startTime = 0.0;
        
        const totalWords = words.length;
        const actualDuration = scene.duration || (totalWords / 2.5);
        const exactDurationPerWord = actualDuration / Math.max(1, totalWords);

        words.forEach((word, index) => {
          currentChunk.push(word);
          
          if (word.match(/[.,!?]$/) || currentChunk.length >= 4 || index === words.length - 1) {
            const chunkDuration = currentChunk.length * exactDurationPerWord;
            
            chunks.push({
              sceneId: scene.id,
              text: currentChunk.join(" "),
              startTime: parseFloat(startTime.toFixed(2)),
              endTime: parseFloat((startTime + chunkDuration).toFixed(2)),
              style: "default",
            });
            
            startTime += chunkDuration;
            currentChunk = [];
          }
        });
      }
    });

    // 5. Batch create SubtitleChunk records in a single high-performance query
    await prisma.subtitleChunk.createMany({
      data: chunks,
    });

    const createdChunks = await prisma.subtitleChunk.findMany({
      where: { sceneId: { in: sceneIds } },
      orderBy: { startTime: "asc" },
    });

    // 6. Update pipeline state to ready for export
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "EXPORT_QUEUED" },
    });

    return { success: true, data: createdChunks };
  } catch (error) {
    console.error("Subtitle generation error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate subtitles" 
    };
  }
}
