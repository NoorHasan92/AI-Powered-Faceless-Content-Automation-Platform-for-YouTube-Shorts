// File Location: src/actions/project.actions.ts
// Server Actions for project mutations.
// Thin wrapper — validates input with Zod, delegates to project.service.

"use server";

import { revalidatePath } from "next/cache";
import { createProjectSchema } from "@/validations/project.schema";
import { createProject } from "@/services/project.service";

/**
 * Server Action: Create a new project from form data.
 * Called by the project creation form on /projects.
 */
export async function createProjectAction(formData: FormData) {
  const raw = {
    title: formData.get("title"),
    niche: formData.get("niche"),
    tone: formData.get("tone"),
  };

  // Validate with Zod
  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return; // Silently reject invalid input (form has client-side `required` too)
  }

  await createProject(parsed.data);
  revalidatePath("/projects");
}
