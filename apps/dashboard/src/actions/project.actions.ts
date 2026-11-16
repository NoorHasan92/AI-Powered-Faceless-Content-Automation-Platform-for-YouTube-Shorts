// File Location: src/actions/project.actions.ts
// Server Actions for project mutations.
// Thin wrapper — validates input with Zod, delegates to project.service.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectSchema } from "@/validations/project.schema";
import { createProject, archiveProject, deleteProject } from "@/services/project.service";

/**
 * Server Action: Permanently delete a project.
 */
export async function deleteProjectAction(projectId: string) {
  await deleteProject(projectId);
  revalidatePath("/archived");
  redirect("/archived");
}

/**
 * Server Action: Discard an incomplete project.
 */
export async function discardProjectAction(projectId: string) {
  await deleteProject(projectId);
  revalidatePath("/projects");
  redirect("/projects");
}

/**
 * Server Action: Archive a project.
 */
export async function archiveProjectAction(projectId: string) {
  await archiveProject(projectId, true);
  revalidatePath("/projects");
  revalidatePath("/archived");
}

/**
 * Server Action: Create a new project from form data.
 * Called by the project creation form on /projects.
 */
export async function createProjectAction(formData: FormData) {
  const rawSubtopics = formData.get("subtopics");
  const subtopics = typeof rawSubtopics === "string"
    ? rawSubtopics.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    : [];

  const raw = {
    title: formData.get("title"),
    niche: formData.get("niche"),
    tone: formData.get("tone"),
    targetDuration: formData.get("targetDuration"),
    videoFormat: formData.get("videoFormat") || "SHORTS",
    aspectRatio: formData.get("aspectRatio") || (formData.get("videoFormat") === "LONG_FORM" ? "16:9" : "9:16"),
    subtopics,
    voice: formData.get("voice"),
    bgmTrack: formData.get("bgmTrack") || "cinematic_documentary",
    specificTopic: formData.get("specificTopic") || undefined,
    creatorInstructions: formData.get("creatorInstructions") || undefined,
  };

  // Validate with Zod
  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return; // Silently reject invalid input (form has client-side `required` too)
  }

  const result = await createProject(parsed.data);
  if (result.success && result.data) {
    revalidatePath("/projects");
    redirect(`/projects/${result.data.id}`);
  }
}
