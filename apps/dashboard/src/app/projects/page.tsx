// File Location: src/app/projects/page.tsx
import { Video, Sparkles } from "lucide-react";
import { getProjects } from "@/services/project.service";
import SectionCard from "@/components/ui/SectionCard";
import CreateProjectForm from "@/components/project/CreateProjectForm";
import ProjectCard from "@/components/project/ProjectCard";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Video Projects</h1>
          <p className="text-slate-500 mt-1">
            Generate and monitor your automated shorts pipelines.
          </p>
        </div>
      </header>

      <SectionCard title="Forge a New Short" icon={Sparkles} iconColor="text-blue-500">
        <CreateProjectForm />
      </SectionCard>

      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <Video className="mx-auto text-slate-300 mb-3" size={40} />
          <h3 className="text-lg font-medium text-slate-900">
            No active pipelines running
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1 text-sm">
            Fill out the form above to trigger the multi-agent AI script
            generation, voiceovers, and automatic video editing tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Active Pipelines</h3>
          <div className="grid gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}