// File Location: src/services/project.service.ts
// Business logic for project CRUD operations.
// Keeps database access out of pages and actions thin.

import { prisma } from "@/lib/prisma";
import type { CreateProjectInput, ServiceResult } from "@/lib/types";
import type { Project } from "@prisma/client";

/**
 * Fetch all projects, newest first.
 */
export async function getProjects(options?: { isArchived?: boolean }): Promise<Project[]> {
  return prisma.project.findMany({
    where: options?.isArchived !== undefined ? { isArchived: options.isArchived } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Fetch a single project with all related pipeline data.
 * Returns null if the project doesn't exist.
 */
export async function getProjectWithPipeline(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      script: {
        include: {
          scenes: {
            include: {
              voiceover: true,
              subtitles: true,
              assets: true,
            }
          },
        },
      },
      exportJobs: true,
    },
  });
}

/**
 * Create a new project from validated input.
 */
export async function createProject(
  input: CreateProjectInput
): Promise<ServiceResult<Project>> {
  try {
    const project = await prisma.project.create({
      data: {
        title: input.title,
        niche: input.niche,
        tone: input.tone,
        targetDuration: input.targetDuration,
        videoFormat: input.videoFormat || "SHORTS",
        aspectRatio: input.aspectRatio || "9:16",
        subtopics: input.subtopics || [],
        bgmTrack: input.bgmTrack || "cinematic_documentary",
        voice: input.voice,
        specificTopic: input.specificTopic,
        creatorInstructions: input.creatorInstructions,
      },
    });
    return { success: true, data: project };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

/**
 * Update a project's pipeline status.
 */
export async function updateProjectStatus(
  projectId: string,
  status: string
): Promise<void> {
  await prisma.project.update({
    where: { id: projectId },
    data: { status: status as never },
  });
}

/**
 * Get recent projects for the dashboard activity feed.
 */
export async function getRecentProjects(limit: number = 5): Promise<Project[]> {
  return prisma.project.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Get aggregate dashboard stats.
 */
export async function getDashboardStats() {
  const [activeProjects, totalVideos, pendingUploads] = await Promise.all([
    prisma.project.count({
      where: {
        status: { notIn: ["COMPLETED", "FAILED", "DRAFT"] },
        isArchived: false,
      },
    }),
    prisma.exportJob.count({
      where: { status: "COMPLETED" },
    }),
    prisma.exportJob.count({
      where: { status: "PROCESSING" },
    }),
  ]);

  return { activeProjects, totalVideos, pendingUploads };
}

/**
 * Archive or unarchive a project.
 */
export async function archiveProject(
  projectId: string,
  isArchived: boolean = true
): Promise<void> {
  await prisma.project.update({
    where: { id: projectId },
    data: { isArchived },
  });
}

import { cleanProjectArtifacts } from "@/lib/audio-utils";
import { deleteProjectCloudinaryAssets } from "@/lib/cloudinary-upload";

/**
 * Completely delete a project and all its generated files from the system.
 * Cloudinary cleanup is best-effort — failures are logged but don't block deletion.
 */
export async function deleteProject(projectId: string): Promise<void> {
  // 1. Attempt Cloudinary cleanup (best-effort)
  try {
    await deleteProjectCloudinaryAssets(projectId);
  } catch (err) {
    console.warn(
      `[deleteProject] Cloudinary cleanup failed for project ${projectId}, continuing with deletion:`,
      err instanceof Error ? err.message : err
    );
  }

  // 2. Delete all generated audio, video, and image files on disk
  cleanProjectArtifacts(projectId);
  
  // 3. Delete from DB (Prisma cascade handles related models)
  await prisma.project.delete({
    where: { id: projectId },
  });
}

