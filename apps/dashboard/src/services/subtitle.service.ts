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
    // 1. Get the script and scenes
    const script = await prisma.script.findUnique({
      where: { projectId },
      include: { scenes: true },
    });

    if (!script || script.scenes.length === 0) {
      throw new Error("No script or scenes found to generate subtitles for.");
    }

    // 2. Clear existing subtitles for this project's scenes (retry support)
    const sceneIds = script.scenes.map(s => s.id);
    await prisma.subtitleChunk.deleteMany({
      where: { sceneId: { in: sceneIds } },
    });

    // 3. Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Generate naive chunks
    const chunks: any[] = [];
    
    script.scenes.forEach(scene => {
      // Split narration into chunks of ~4-6 words each for punchy captions
      const words = scene.narrationText.split(" ").filter(w => w.trim().length > 0);
      let currentChunk: string[] = [];
      let startTime = 0.0;
      
      const totalWords = words.length;
      const actualDuration = scene.duration || (totalWords / 2.5);
      const exactDurationPerWord = actualDuration / totalWords;

      words.forEach((word, index) => {
        currentChunk.push(word);
        
        // Break chunk on punctuation or when it hits 4 words
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
    });

    // 5. Create SubtitleChunk records
    const createdChunks = await prisma.$transaction(
      chunks.map(chunkData => 
        prisma.subtitleChunk.create({ data: chunkData })
      )
    );

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
