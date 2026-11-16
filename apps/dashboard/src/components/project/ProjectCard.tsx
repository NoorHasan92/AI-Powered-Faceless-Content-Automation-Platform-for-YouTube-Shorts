// File Location: src/components/project/ProjectCard.tsx
// High-end SaaS video project card with format badges, metadata pills, and hover animations.

import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Project } from "@prisma/client";
import { Smartphone, MonitorPlay, ArrowRight, Music, Mic, Clock } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const isLongForm = project.videoFormat === "LONG_FORM";
  const voiceName = project.voice ? project.voice.split("-")[2]?.replace("MultilingualNeural", "") || project.voice : "Ava";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-blue-400/80 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer overflow-hidden"
    >
      {/* Left colored border accent */}
      <div
        className={`absolute left-0 inset-y-0 w-1 transition-all group-hover:w-1.5 ${
          isLongForm
            ? "bg-gradient-to-b from-purple-500 to-indigo-600"
            : "bg-gradient-to-b from-blue-500 to-cyan-500"
        }`}
      />

      <div className="flex items-start gap-4 min-w-0 pl-1">
        {/* Format Icon Avatar */}
        <div
          className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${
            isLongForm
              ? "bg-purple-50 text-purple-600 border border-purple-100"
              : "bg-blue-50 text-blue-600 border border-blue-100"
          }`}
        >
          {isLongForm ? <MonitorPlay size={22} /> : <Smartphone size={22} />}
        </div>

        {/* Info Column */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isLongForm
                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {isLongForm ? "16:9 Long-Form" : "9:16 Short"}
            </span>

            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Clock size={12} className="text-slate-400" />
              {project.targetDuration}
            </span>

            <span className="text-slate-300">•</span>

            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              {project.niche}
            </span>
          </div>

          <h4 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
            {project.title}
          </h4>

          {/* Secondary Details */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Mic size={12} className="text-slate-400" />
              {voiceName} ({project.tone})
            </span>

            {project.bgmTrack && project.bgmTrack !== "none" && (
              <span className="flex items-center gap-1 text-slate-500">
                <Music size={12} className="text-purple-400" />
                {project.bgmTrack.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Status & Action Arrow */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
        <StatusBadge status={project.status} />

        <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all duration-150 shadow-xs">
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
