import { Archive, Video } from "lucide-react";
import { getProjects } from "@/services/project.service";
import ProjectCard from "@/components/project/ProjectCard";

export const dynamic = "force-dynamic";

export default async function ArchivedProjectsPage() {
  const projects = await getProjects({ isArchived: true });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <header className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Storage Vault
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {projects.length} Archived
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Archived Projects
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Completed and archived video pipelines preserved in cold storage.
          </p>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <Archive className="mx-auto text-slate-300 mb-3" size={44} />
          <h3 className="text-base font-bold text-slate-900">
            No archived projects
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1 text-xs">
            When you complete a project, you can archive it to keep your active workspace organized.
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
