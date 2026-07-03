// File Location: src/app/projects/[id]/page.tsx
// This file displays project details and controls both the Script and Video generation pipelines.
// It conditionally renders action buttons based on the current pipeline status with loading states.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Film, FileText, Clapperboard, RefreshCw, Play, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { generateScriptAction, generateVideoAction } from "./actions";
import SubmitButton from "@/components/SubmitButton";

interface ProjectDetailsProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsProps) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      script: {
        include: {
          scenes: true,
        },
      },
      videos: true,
    },
  });

  if (!project) {
    notFound();
  }

  // Pre-bind server actions
  const triggerScriptAgent = generateScriptAction.bind(null, project.id, project.niche, project.tone);
  const triggerVideoAgent = generateVideoAction.bind(null, project.id);

  // Status badge color mapping
  const statusStyles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border border-slate-200",
    GENERATING_SCRIPT: "bg-amber-50 text-amber-700 border border-amber-200",
    GENERATING_ASSETS: "bg-blue-50 text-blue-700 border border-blue-200",
    COMPILING_VIDEO: "bg-purple-50 text-purple-700 border border-purple-200",
    COMPLETED: "bg-green-50 text-green-700 border border-green-200",
    FAILED: "bg-red-50 text-red-700 border border-red-200",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-4">
        <Link
          href="/projects"
          className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{project.title}</h1>
            <p className="text-slate-500 mt-1 capitalize">
              Niche: {project.niche} • Tone: {project.tone}
            </p>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wider ${
              statusStyles[project.status] || statusStyles.DRAFT
            }`}
          >
            {project.status}
          </span>
        </div>
      </header>

      {/* Error Recovery Banner — shown when the pipeline has failed */}
      {project.status === "FAILED" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={22} />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 text-sm">Pipeline Failed</h3>
            <p className="text-red-700 text-sm mt-1">
              The AI generation encountered an error. You can retry the script generation below —
              any previous partial data will be cleaned up automatically.
            </p>
            <form action={triggerScriptAgent} className="mt-3">
              <SubmitButton
                pendingText="Retrying..."
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
              >
                <RefreshCw size={14} /> Retry Script Generation
              </SubmitButton>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Scripts and Scenes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="text-blue-500" size={20} />
              AI Generated Script
            </h3>

            {!project.script ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-slate-500 text-sm">
                  No script generated for this project yet.
                </p>
                {project.status !== "FAILED" && (
                  <form action={triggerScriptAgent}>
                    <SubmitButton
                      pendingText="AI is writing..."
                      className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
                    >
                      <RefreshCw size={14} /> Trigger AI Script Agent
                    </SubmitButton>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-sm text-slate-700">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="font-semibold text-blue-800 text-xs uppercase tracking-wider block mb-1">
                    Hook
                  </span>
                  <p className="text-slate-800">{project.script.hook}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800 text-xs uppercase tracking-wider block mb-1">
                    Body Text
                  </span>
                  <p className="whitespace-pre-line text-slate-700">{project.script.bodyText}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <span className="font-semibold text-purple-800 text-xs uppercase tracking-wider block mb-1">
                    Call to Action (CTA)
                  </span>
                  <p className="text-slate-800">{project.script.cta}</p>
                </div>
              </div>
            )}
          </div>

          {project.script && project.script.scenes.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clapperboard className="text-blue-500" size={20} />
                Visual Storyboard
              </h3>
              <div className="space-y-4">
                {project.script.scenes
                  .sort((a, b) => a.sceneIndex - b.sceneIndex)
                  .map((scene) => (
                    <div
                      key={scene.id}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-sm"
                    >
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                        <span>SCENE {scene.sceneIndex + 1}</span>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          {scene.duration}s
                        </span>
                      </div>
                      <p className="text-slate-900 font-medium">
                        🗣️ Narration: &quot;{scene.narrationText}&quot;
                      </p>
                      <p className="text-slate-600 bg-white p-2.5 rounded border border-slate-100 text-xs italic">
                        🎬 Visual Prompt: {scene.visualPrompt}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Render Queue */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Film className="text-blue-500" size={20} />
              Render Queue
            </h3>

            {project.videos.length === 0 ? (
              <div className="py-4 text-center space-y-4">
                <p className="text-slate-500 text-sm">
                  {project.status === "GENERATING_ASSETS"
                    ? "Assets are ready. You can now compile the final video."
                    : "Complete the script phase to unlock rendering."}
                </p>

                {/* Only show the render button if the script phase is done */}
                {project.status === "GENERATING_ASSETS" && (
                  <form action={triggerVideoAgent}>
                    <SubmitButton
                      pendingText="Compiling..."
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm"
                    >
                      <Play size={16} /> Run Video Composer Agent
                    </SubmitButton>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {project.videos.map((video) => (
                  <div
                    key={video.id}
                    className="p-4 bg-green-50 rounded-lg border border-green-200 text-sm space-y-2"
                  >
                    <div className="flex justify-between items-center border-b border-green-100 pb-2">
                      <p className="font-bold text-green-900 flex items-center gap-2">
                        <Film size={16} /> Rendered Output
                      </p>
                      <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-semibold">
                        {video.publishStatus}
                      </span>
                    </div>
                    <p className="text-green-800 text-xs">
                      Quality Score:{" "}
                      <span className="font-bold">{video.qualityScore}/10</span>
                    </p>
                    <p className="text-green-800 text-xs">
                      Scheduled: {video.scheduledFor?.toLocaleDateString()}
                    </p>
                    <button className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors">
                      Download MP4
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}