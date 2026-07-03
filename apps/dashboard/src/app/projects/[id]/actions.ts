// File Location: src/app/projects/[id]/actions.ts
// This file handles the backend logic for interacting with the Google Gemini API.
// It generates structured JSON scripts and updates the project status in the database.

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini SDK with the key from your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ---------------------------------------------------------------------------
// Validation helper — ensures the Gemini response matches our Prisma schema
// ---------------------------------------------------------------------------
interface SceneData {
    narrationText: string;
    visualPrompt: string;
    onScreenCaption: string;
    duration: number;
}

interface ScriptAIResponse {
    hook: string;
    bodyText: string;
    cta: string;
    metaTitle: string;
    metaDescription: string;
    scenes: SceneData[];
}

function validateAIResponse(data: unknown): ScriptAIResponse {
    if (!data || typeof data !== "object") {
        throw new Error("AI returned an invalid response format (not an object).");
    }

    const obj = data as Record<string, unknown>;

    // Check all required top-level string fields
    const requiredStrings = ["hook", "bodyText", "cta", "metaTitle", "metaDescription"] as const;
    for (const field of requiredStrings) {
        if (typeof obj[field] !== "string" || (obj[field] as string).trim().length === 0) {
            throw new Error(`AI response missing or empty required field: "${field}".`);
        }
    }

    // Validate scenes array
    if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
        throw new Error("AI response must contain at least one scene.");
    }

    const validatedScenes: SceneData[] = obj.scenes.map((scene: unknown, i: number) => {
        if (!scene || typeof scene !== "object") {
            throw new Error(`Scene ${i + 1} is not a valid object.`);
        }
        const s = scene as Record<string, unknown>;

        if (typeof s.narrationText !== "string" || !s.narrationText.trim()) {
            throw new Error(`Scene ${i + 1} is missing "narrationText".`);
        }
        if (typeof s.visualPrompt !== "string" || !s.visualPrompt.trim()) {
            throw new Error(`Scene ${i + 1} is missing "visualPrompt".`);
        }

        return {
            narrationText: s.narrationText as string,
            visualPrompt: s.visualPrompt as string,
            onScreenCaption: typeof s.onScreenCaption === "string" ? s.onScreenCaption : "",
            duration: typeof s.duration === "number" && s.duration > 0 ? s.duration : 4.0,
        };
    });

    return {
        hook: obj.hook as string,
        bodyText: obj.bodyText as string,
        cta: obj.cta as string,
        metaTitle: obj.metaTitle as string,
        metaDescription: obj.metaDescription as string,
        scenes: validatedScenes,
    };
}

// ---------------------------------------------------------------------------
// Script generation action — calls Gemini, validates, and saves to DB
// ---------------------------------------------------------------------------
export async function generateScriptAction(projectId: string, niche: string, tone: string) {
    try {
        // 1. Update status to show the AI is thinking
        await prisma.project.update({
            where: { id: projectId },
            data: { status: "GENERATING_SCRIPT" },
        });

        // 2. Delete any existing script to allow retry/regeneration
        //    (Scenes cascade-delete automatically via the Prisma schema)
        await prisma.script.deleteMany({
            where: { projectId: projectId },
        });

        // 3. Configure the Gemini Model to strictly output JSON
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite",
            generationConfig: { responseMimeType: "application/json" },
        });

        // 4. The System Prompt mapping exactly to our Prisma schema
        const prompt = `
      You are an expert short-form video scriptwriter and director.
      Create a highly engaging, viral-style script for a YouTube Short.
      
      Topic/Niche: ${niche}
      Tone: ${tone}
      
      You must return ONLY a raw JSON object matching this exact structure:
      {
        "hook": "A 1-2 sentence extremely catchy opening.",
        "bodyText": "The main educational or entertaining content.",
        "cta": "A short call to action to subscribe or like.",
        "metaTitle": "A clickbait-friendly title under 50 characters",
        "metaDescription": "A 2-sentence description for the video",
        "scenes": [
          {
            "narrationText": "The exact words spoken in this scene",
            "visualPrompt": "A highly detailed prompt for an AI video generator (e.g., 'Cinematic 4k shot of a glowing jellyfish, dark ocean background, neon colors')",
            "onScreenCaption": "1-4 words of punchy text to display on screen",
            "duration": 4.5
          }
        ]
      }
      
      Rules:
      - Create exactly 4 to 6 scenes.
      - Ensure the visualPrompts are highly descriptive for an AI image/video generator.
      - The duration should be an estimated time in seconds to speak the narration.
    `;

        // 5. Call the Gemini API
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 6. Parse and VALIDATE the AI's JSON output
        const rawData = JSON.parse(responseText);
        const aiData = validateAIResponse(rawData);

        // 7. Save the validated AI data to the PostgreSQL database
        await prisma.script.create({
            data: {
                projectId: projectId,
                hook: aiData.hook,
                bodyText: aiData.bodyText,
                cta: aiData.cta,
                metaTitle: aiData.metaTitle,
                metaDescription: aiData.metaDescription,
                scenes: {
                    create: aiData.scenes.map((scene, index) => ({
                        sceneIndex: index,
                        narrationText: scene.narrationText,
                        visualPrompt: scene.visualPrompt,
                        onScreenCaption: scene.onScreenCaption,
                        duration: scene.duration,
                    })),
                },
            },
        });

        // 8. Move pipeline forward
        await prisma.project.update({
            where: { id: projectId },
            data: { status: "GENERATING_ASSETS" },
        });

        revalidatePath(`/projects/${projectId}`);

    } catch (error) {
        console.error("AI Generation Error:", error);
        // Mark project as failed if the AI crashes or returns bad JSON
        await prisma.project.update({
            where: { id: projectId },
            data: { status: "FAILED" },
        });
        revalidatePath(`/projects/${projectId}`);
    }
}

// ------------------------------------------------------------------
// Video rendering simulation action
// ------------------------------------------------------------------
export async function generateVideoAction(projectId: string) {
    await prisma.project.update({
        where: { id: projectId },
        data: { status: "COMPILING_VIDEO" },
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await prisma.video.create({
        data: {
            projectId: projectId,
            fileUrl: "https://example.com/mock-rendered-video.mp4",
            publishStatus: "SCHEDULED",
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
            qualityScore: 9.5,
        },
    });

    await prisma.project.update({
        where: { id: projectId },
        data: { status: "COMPLETED" },
    });

    revalidatePath(`/projects/${projectId}`);
}