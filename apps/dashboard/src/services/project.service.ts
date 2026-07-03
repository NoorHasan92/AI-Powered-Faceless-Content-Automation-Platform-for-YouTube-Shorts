// File Location: src/services/project.service.ts
// Business logic for project CRUD operations.
// Keeps database access out of pages and actions thin.

import { prisma } from "@/lib/prisma";
import type { CreateProjectInput, ServiceResult } from "@/lib/types";
import type { Project } from "@prisma/client";

/**
 * Fetch all projects, newest first.
 */
export async function getProjects(): Promise<Project[]> {
  return prisma.project.findMany({
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
      videos: true,
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
