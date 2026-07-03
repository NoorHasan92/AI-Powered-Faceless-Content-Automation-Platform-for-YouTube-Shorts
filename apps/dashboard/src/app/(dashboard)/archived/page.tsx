import { Archive, Video } from "lucide-react";
import { getProjects } from "@/services/project.service";
import ProjectCard from "@/components/project/ProjectCard";

export default async function ArchivedProjectsPage() {
  const projects = await getProjects({ isArchived: true });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Archive className="text-slate-400" size={32} />
            Archived Projects
          </h1>
          <p className="text-slate-500 mt-1">
            Completed projects that have been moved out of your active pipeline.
          </p>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <Archive className="mx-auto text-slate-300 mb-3" size={40} />
          <h3 className="text-lg font-medium text-slate-900">
            No archived projects
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1 text-sm">
            When you finish a project, you can archive it to keep your active workspace clear.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
