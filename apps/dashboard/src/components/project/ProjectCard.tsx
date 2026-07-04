// File Location: src/components/project/ProjectCard.tsx
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Project } from "@prisma/client";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-3 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="min-w-0 pr-4">
        <h4 className="font-semibold text-slate-900">{project.title}</h4>
        <p className="text-sm text-slate-500 capitalize">
          {project.niche} • {project.tone}
        </p>
      </div>
      <StatusBadge status={project.status} />
    </Link>
  );
}
