// File Location: src/app/projects/page.tsx
// This file renders the projects page as a Server Component.
// It fetches projects from Prisma and displays them as a clickable list to view details.

import { Plus, Video, Sparkles } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProjectAction } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function ProjectsPage() {
  // Fetch all projects from the database, ordering by the newest first
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });

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

      {/* Creation Form linked to our Server Action */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="text-blue-500" size={20} />
          Forge a New Short
        </h2>

        <form
          action={createProjectAction}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project Working Title
            </label>
            <input
              type="text"
              name="title"
              placeholder="e.g., Quantum Physics Explained"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Content Niche
            </label>
            <select
              name="niche"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
            >
              <option value="science">Weird Science Facts</option>
              <option value="animals">Animal Psychology</option>
              <option value="finance">Money &amp; Finance Secrets</option>
              <option value="history">Untold History Stories</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Narration Tone
            </label>
            <select
              name="tone"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
            >
              <option value="educational">Educational &amp; Clear</option>
              <option value="dramatic">Dramatic &amp; Cinematic</option>
              <option value="casual">Casual &amp; Conversational</option>
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end mt-2">
            <SubmitButton
              pendingText="Initializing..."
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors shadow-sm"
            >
              <Plus size={18} /> Initialize Pipeline
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* Dynamic Active Queues State */}
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
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div>
                  <h4 className="font-semibold text-slate-900">{project.title}</h4>
                  <p className="text-sm text-slate-500 capitalize">
                    {project.niche} • {project.tone}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                    project.status === "COMPLETED"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : project.status === "FAILED"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {project.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}