// File Location: src/app/projects/[id]/page.tsx
// This file displays project details and controls both the Script and Video generation pipelines.

import { notFound } from "next/navigation";
import { ArrowLeft, Film, Clapperboard, RefreshCw, Play, AlertTriangle, Archive, Trash2 } from "lucide-react";
import Link from "next/link";
import { getProjectWithPipeline } from "@/services/project.service";
import { generateScriptAction } from "@/actions/script.actions";
import { triggerExportAction } from "@/actions/export.actions";
import { archiveProjectAction, deleteProjectAction, discardProjectAction } from "@/actions/project.actions";
import SubmitButton from "@/components/ui/SubmitButton";
import StatusBadge from "@/components/ui/StatusBadge";
import ScriptPanel from "@/components/script/ScriptPanel";
import SceneInspector from "@/components/project/SceneInspector";
import VoiceoverPanel from "@/components/voiceover/VoiceoverPanel";
import SubtitlePanel from "@/components/subtitle/SubtitlePanel";
import ExportPanel from "@/components/export/ExportPanel";
import AssetPanel from "@/components/asset/AssetPanel";
import { generateVoiceoverAction } from "@/actions/voiceover.actions";
import { generateSubtitlesAction } from "@/actions/subtitle.actions";
import { generateAssetsAction } from "@/actions/asset.actions";

interface ProjectDetailsProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsProps) {
  const { id } = await params;
  const project = await getProjectWithPipeline(id);

  if (!project) {
    notFound();
  }

  // Pre-bind server actions
  const triggerScriptAgent = generateScriptAction.bind(
    null, 
    project.id, 
    project.niche, 
    project.tone, 
    project.targetDuration,
    project.specificTopic,
    project.creatorInstructions
  );
  const triggerVideoAgent = triggerExportAction.bind(null, project.id);
  const triggerVoiceoverAgent = generateVoiceoverAction.bind(null, project.id);
  const triggerAssetAgent = generateAssetsAction.bind(null, project.id);
  const triggerSubtitleAgent = generateSubtitlesAction.bind(null, project.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      <header className="space-y-4">
        <Link
          href={project.isArchived ? "/archived" : "/projects"}
          className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} /> Back to {project.isArchived ? "Archived" : "Projects"}
        </Link>
        <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">{project.title}</h1>
            <p className="text-slate-500 mt-1 capitalize text-sm md:text-base">
              {project.niche} • {project.tone} • {project.targetDuration} • {project.voice.split("-")[2].replace("MultilingualNeural", "")}
            </p>
            {project.specificTopic && (
              <p className="text-blue-600 mt-1.5 text-sm font-medium">
                Topic Seed: {project.specificTopic}
              </p>
            )}
            {project.creatorInstructions && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg max-w-2xl overflow-hidden">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1 block">Director Notes</span>
                <p className="text-sm text-amber-900 whitespace-pre-wrap break-words">
                  "{project.creatorInstructions}"
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            <StatusBadge status={project.status} />
            {project.status === "COMPLETED" && !project.isArchived && (
              <form action={archiveProjectAction.bind(null, project.id)} className="flex-1 md:flex-none">
                <SubmitButton
                  pendingText="Archiving..."
                  className="w-full justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-1.5 px-3 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Archive size={14} /> Archive
                </SubmitButton>
              </form>
            )}
            {project.status !== "COMPLETED" && !project.isArchived && (
              <form action={discardProjectAction.bind(null, project.id)} className="flex-1 md:flex-none">
                <SubmitButton
                  pendingText="Discarding..."
                  className="w-full justify-center bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-medium py-1.5 px-3 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Discard
                </SubmitButton>
              </form>
            )}
            {project.isArchived && (
              <>
                <span className="bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Archive size={12} /> Archived
                </span>
                <form action={deleteProjectAction.bind(null, project.id)} className="flex-1 md:flex-none">
                  <SubmitButton
                    pendingText="Deleting..."
                    className="w-full justify-center bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-medium py-1.5 px-3 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Delete
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Error Recovery Banner */}
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
          <ScriptPanel 
            script={project.script} 
            status={project.status} 
            onGenerateAction={triggerScriptAgent} 
          />

          {project.script && project.script.scenes.length > 0 && (
            <SceneInspector scenes={project.script.scenes} />
          )}
        </div>

        {/* Right Column: Production Modules & Render Queue */}
        <div className="space-y-6">
          <VoiceoverPanel 
            status={project.status} 
            scenes={project.script?.scenes || []} 
            onGenerateAction={triggerVoiceoverAgent}
          />

          <AssetPanel
            status={project.status}
            scenes={project.script?.scenes || []}
            onGenerateAction={triggerAssetAgent}
          />

          <SubtitlePanel 
            status={project.status} 
            scenes={project.script?.scenes || []} 
            onGenerateAction={triggerSubtitleAgent}
          />

          <ExportPanel
            status={project.status}
            exportJobs={project.exportJobs || []}
            onGenerateAction={triggerVideoAgent}
          />
        </div>
      </div>
    </div>
  );
}