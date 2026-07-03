// File Location: src/services/voiceover.service.ts
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { Voiceover } from "@prisma/client";

/**
 * Trigger voiceover generation for all scenes in a project.
 * 
 * Phase 1 Placeholder: This simulates an API call to a TTS provider 
 * and creates mock Voiceover records in the database.
 */
export async function generateVoiceovers(projectId: string): Promise<ServiceResult<Voiceover[]>> {
  try {
    // 1. Get the script and scenes
    const script = await prisma.script.findUnique({
      where: { projectId },
      include: { scenes: true },
    });

    if (!script || script.scenes.length === 0) {
      throw new Error("No script or scenes found to generate voiceovers for.");
    }

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

    // 4. Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Create Voiceover records
    const voiceovers = await prisma.$transaction(
      script.scenes.map(scene => {
        // Mock calculation: roughly 150 words per min -> 2.5 words per sec
        const wordCount = scene.narrationText.split(" ").length;
        const duration = Math.max(1, wordCount / 2.5);

        return prisma.voiceover.create({
          data: {
            sceneId: scene.id,
            provider: "elevenlabs-mock",
            audioUrl: "https://example.com/mock-audio.mp3",
            duration: parseFloat(duration.toFixed(2)),
            status: "COMPLETED",
          }
        });
      })
    );
    
    // Also update scene durations with the simulated audio durations
    await Promise.all(
      voiceovers.map(vo => 
        prisma.scene.update({
          where: { id: vo.sceneId },
          data: { duration: vo.duration || 0 }
        })
      )
    );

    return { success: true, data: voiceovers };
  } catch (error) {
    console.error("Voiceover generation error:", error);
    
    // Don't fail the whole project, just leave it IN_PRODUCTION for retry
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate voiceovers" 
    };
  }
}
