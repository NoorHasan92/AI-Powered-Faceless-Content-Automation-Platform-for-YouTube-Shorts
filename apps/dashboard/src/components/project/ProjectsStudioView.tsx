"use client";

import { useState, useEffect } from "react";
import { Plus, Video, Sparkles, Search, Filter, Smartphone, MonitorPlay, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Project } from "@prisma/client";
import ProjectCard from "@/components/project/ProjectCard";
import CreateProjectForm from "@/components/project/CreateProjectForm";

interface ProjectsStudioViewProps {
  initialProjects: Project[];
}

export default function ProjectsStudioView({ initialProjects }: ProjectsStudioViewProps) {
  const [isCreating, setIsCreating] = useState(initialProjects.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFormat, setFilterFormat] = useState<"ALL" | "SHORTS" | "LONG_FORM">("ALL");

  // Silently pre-warm the Render worker backend as soon as user enters the studio
  useEffect(() => {
    const workerUrl = process.env.NEXT_PUBLIC_RENDER_WORKER_URL;
    if (workerUrl) {
      fetch(`${workerUrl}/api/health`, { mode: "no-cors" }).catch(() => {});
    }
  }, []);

  const filteredProjects = initialProjects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.specificTopic && p.specificTopic.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFormat =
      filterFormat === "ALL" || p.videoFormat === filterFormat;

    return matchesSearch && matchesFormat;
  });

  const shortsCount = initialProjects.filter((p) => p.videoFormat === "SHORTS").length;
  const longFormCount = initialProjects.filter((p) => p.videoFormat === "LONG_FORM").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top SaaS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Pipeline Hub
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {initialProjects.length} Total Projects
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Video Production Studio
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Automated multi-agent pipelines for viral Shorts and investigative documentaries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
            isCreating
              ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 hover:shadow-lg"
          }`}
        >
          {isCreating ? (
            "Close Creator"
          ) : (
            <>
              <Plus size={18} /> New Video Project
            </>
          )}
        </button>
      </div>

      {/* Expandable Wizard Studio */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-200/50 relative">
              <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">AI Video Creator Wizard</h2>
                    <p className="text-xs text-slate-500">Configure your script, research depth, and narration audio.</p>
                  </div>
                </div>

                {initialProjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <CreateProjectForm />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects Gallery Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Format Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterFormat("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterFormat === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({initialProjects.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterFormat("SHORTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterFormat === "SHORTS"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone size={12} /> Shorts ({shortsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterFormat("LONG_FORM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterFormat === "LONG_FORM"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MonitorPlay size={12} /> 16:9 Docs ({longFormCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 shadow-2xs"
            />
          </div>
        </div>

        {/* Project Cards List */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <Video className="mx-auto text-slate-300 mb-3" size={44} />
            <h3 className="text-base font-bold text-slate-900">
              {searchQuery ? "No matching projects found" : "No active video projects"}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-1 text-xs">
              {searchQuery
                ? "Try searching with different keywords or switch the format filter."
                : "Launch the AI Video Creator Wizard to generate high-retention Shorts or full documentaries."}
            </p>
            {!isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={14} /> Create Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3.5">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
