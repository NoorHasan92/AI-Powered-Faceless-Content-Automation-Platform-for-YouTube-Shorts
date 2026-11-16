// File Location: src/app/(dashboard)/projects/page.tsx
import { getProjects } from "@/services/project.service";
import ProjectsStudioView from "@/components/project/ProjectsStudioView";

export default async function ProjectsPage() {
  const projects = await getProjects({ isArchived: false });

  return <ProjectsStudioView initialProjects={projects} />;
}
