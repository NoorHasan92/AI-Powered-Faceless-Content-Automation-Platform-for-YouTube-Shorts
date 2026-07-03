// File Location: src/app/projects/actions.ts
// This file contains secure server-side functions (Server Actions).
// It handles saving new projects to the Prisma database and refreshing the page data.

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProjectAction(formData: FormData) {
    // Extract the data from the HTML form
    const title = formData.get("title") as string;
    const niche = formData.get("niche") as string;
    const tone = formData.get("tone") as string;

    // Basic validation to ensure empty forms aren't submitted
    if (!title || !niche || !tone) return;

    // Save the new project to the PostgreSQL database
    await prisma.project.create({
        data: {
            title,
            niche,
            tone,
            // status defaults to "DRAFT" based on our Prisma schema
        },
    });

    // Tell Next.js to instantly refresh the /projects page to show the new data
    revalidatePath("/projects");
}