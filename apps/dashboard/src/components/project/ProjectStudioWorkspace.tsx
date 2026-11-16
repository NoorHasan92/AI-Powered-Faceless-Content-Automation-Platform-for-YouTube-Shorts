"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Film,
  Sparkles,
  Mic,
  Image as ImageIcon,
  MessageSquare,
  Video,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Search,
  ExternalLink,
  Download,
  AlertTriangle,
  Archive,
  Trash2,
  List,
  Grid,
  Music,
  Share2,
  Eye,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmAction from "@/components/ui/ConfirmAction";
import SubmitButton from "@/components/ui/SubmitButton";
import ScriptPanel from "@/components/script/ScriptPanel";
import ResearchPanel from "@/components/project/ResearchPanel";
import VoiceoverPanel from "@/components/voiceover/VoiceoverPanel";
import AssetPanel from "@/components/asset/AssetPanel";
import SubtitlePanel from "@/components/subtitle/SubtitlePanel";
import ExportPanel from "@/components/export/ExportPanel";
import SceneInspectorCard from "@/components/project/SceneInspectorCard";

interface ProjectStudioWorkspaceProps {
  project: any;
  triggerScriptAgent: () => Promise<void>;
  triggerVoiceoverAgent: () => Promise<void>;
  triggerAssetAgent: () => Promise<void>;
  triggerSubtitleAgent: () => Promise<void>;
  triggerVideoAgent: () => Promise<void>;
  archiveProjectAction: () => Promise<void>;
  discardProjectAction: () => Promise<void>;
  deleteProjectAction: () => Promise<void>;
}

export default function ProjectStudioWorkspace({
  project,
  triggerScriptAgent,
  triggerVoiceoverAgent,
  triggerAssetAgent,
  triggerSubtitleAgent,
  triggerVideoAgent,
  archiveProjectAction,
  discardProjectAction,
  deleteProjectAction,
}: ProjectStudioWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"storyboard" | "script" | "research" | "production" | "export">("storyboard");
  const [selectedChapter, setSelectedChapter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [inspectedScene, setInspectedScene] = useState<any | null>(null);

  const isLongForm = project.videoFormat === "LONG_FORM";
  const scenes = project.script?.scenes || [];
  const voiceovers = scenes.filter((s: any) => s.voiceover?.localPath);
  const assets = scenes.filter((s: any) => s.assets && s.assets.length > 0 && s.assets[0].localPath);
  const subtitles = scenes.filter((s: any) => s.subtitles && s.subtitles.length > 0);
  const completedExport = project.exportJobs?.find((j: any) => j.status === "COMPLETED");

  // Determine stage progress
  const hasScript = !!project.script && scenes.length > 0;
  const hasVoiceover = voiceovers.length === scenes.length && scenes.length > 0;
  const hasAssets = assets.length === scenes.length && scenes.length > 0;
  const hasSubtitles = subtitles.length === scenes.length && scenes.length > 0;
  const hasExport = !!completedExport || project.status === "COMPLETED";

  // Distinct chapters
  const chapters: string[] = Array.from(
    new Set(scenes.map((s: any) => s.chapterTitle).filter(Boolean))
  );

  const filteredScenes = scenes.filter((s: any) => {
    if (selectedChapter === "ALL") return true;
    return s.chapterTitle === selectedChapter;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Header & Breadcrumb */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href={project.isArchived ? "/archived" : "/projects"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to {project.isArchived ? "Archived" : "Projects"}
          </Link>

          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />

            {/* Quick Actions (Archive / Discard) */}
            {!project.isArchived && project.status === "COMPLETED" && (
              <ConfirmAction
                action={archiveProjectAction}
                title="Archive Project"
                description="Are you sure you want to archive this completed project?"
                confirmText="Archive"
                pendingText="Archiving..."
                confirmVariant="warning"
                trigger={
                  <button
                    type="button"
                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Archive project"
                  >
                    <Archive size={16} />
                  </button>
                }
              />
            )}

            {!project.isArchived && project.status !== "COMPLETED" && (
              <ConfirmAction
                action={discardProjectAction}
                title="Discard Project"
                description="Are you sure you want to discard this project? All generated files will be permanently deleted."
                confirmText="Discard Forever"
                pendingText="Discarding..."
                confirmVariant="danger"
                trigger={
                  <button
                    type="button"
                    className="p-1.5 text-red-500 hover:text-red-700 bg-white border border-red-200 rounded-lg shadow-2xs hover:bg-red-50 transition-colors cursor-pointer"
                    title="Discard project"
                  >
                    <Trash2 size={16} />
                  </button>
                }
              />
            )}
          </div>
        </div>

        {/* Project Title & Metadata Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isLongForm
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
                }`}
              >
                {isLongForm ? "16:9 Long-Form Doc" : "9:16 Short"}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                {project.targetDuration}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-semibold text-slate-600 capitalize">
                {project.niche} • {project.tone}
              </span>
              {project.bgmTrack && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
                    <Music size={11} /> {project.bgmTrack.replace("_", " ")}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
              {project.title}
            </h1>
            {project.specificTopic && (
              <p className="text-xs text-blue-600 font-medium line-clamp-1">
                Seed: {project.specificTopic}
              </p>
            )}
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Scenes</span>
              <span className="text-sm font-bold text-slate-800">{scenes.length}</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Audio</span>
              <span className="text-sm font-bold text-slate-800">
                {voiceovers.length}/{scenes.length}
              </span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Visuals</span>
              <span className="text-sm font-bold text-slate-800">
                {assets.length}/{scenes.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Visual Pipeline Stepper HUD */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pipeline Orchestration Engine
          </span>
          {project.status === "EXPORTING" && (
            <span className="text-xs font-bold text-purple-600 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
              Compiling 1080p Video...
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Step 1: Script */}
          <div
            className={`p-3 rounded-xl border flex flex-col justify-between ${
              hasScript
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase">1. Script</span>
              {hasScript ? (
                <CheckCircle2 size={14} className="text-emerald-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
            <span className="text-xs font-bold truncate">
              {hasScript ? `${scenes.length} Scenes Ready` : "Needs Script"}
            </span>
          </div>

          {/* Step 2: Voiceover */}
          <div
            className={`p-3 rounded-xl border flex flex-col justify-between ${
              hasVoiceover
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                : hasScript
                ? "bg-blue-50/60 border-blue-200 text-blue-900"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase">2. Voiceover</span>
              {hasVoiceover ? (
                <CheckCircle2 size={14} className="text-emerald-600" />
              ) : hasScript ? (
                <Mic size={14} className="text-blue-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              )}
            </div>
            <span className="text-xs font-bold truncate">
              {hasVoiceover ? "24kHz Audio Synced" : hasScript ? "Ready to Generate" : "Waiting"}
            </span>
          </div>

          {/* Step 3: Visual Assets */}
          <div
            className={`p-3 rounded-xl border flex flex-col justify-between ${
              hasAssets
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                : hasVoiceover
                ? "bg-blue-50/60 border-blue-200 text-blue-900"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase">3. Visuals</span>
              {hasAssets ? (
                <CheckCircle2 size={14} className="text-emerald-600" />
              ) : hasVoiceover ? (
                <ImageIcon size={14} className="text-blue-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              )}
            </div>
            <span className="text-xs font-bold truncate">
              {hasAssets ? "100% Footage Loaded" : hasVoiceover ? "Ready to Acquire" : "Waiting"}
            </span>
          </div>

          {/* Step 4: Subtitles */}
          <div
            className={`p-3 rounded-xl border flex flex-col justify-between ${
              hasSubtitles
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                : hasVoiceover
                ? "bg-blue-50/60 border-blue-200 text-blue-900"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase">4. Subtitles</span>
              {hasSubtitles ? (
                <CheckCircle2 size={14} className="text-emerald-600" />
              ) : hasVoiceover ? (
                <MessageSquare size={14} className="text-blue-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              )}
            </div>
            <span className="text-xs font-bold truncate">
              {hasSubtitles ? "Word-Synced Telemetry" : hasVoiceover ? "Ready to Chunk" : "Waiting"}
            </span>
          </div>

          {/* Step 5: Export */}
          <div
            className={`p-3 rounded-xl border flex flex-col justify-between col-span-2 sm:col-span-1 ${
              hasExport
                ? "bg-purple-50/70 border-purple-200 text-purple-900"
                : hasAssets && hasSubtitles
                ? "bg-blue-50/60 border-blue-200 text-blue-900"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase">5. Final Video</span>
              {hasExport ? (
                <CheckCircle2 size={14} className="text-purple-600" />
              ) : hasAssets && hasSubtitles ? (
                <Video size={14} className="text-blue-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              )}
            </div>
            <span className="text-xs font-bold truncate">
              {hasExport ? "MP4 Ready" : hasAssets && hasSubtitles ? "Ready to Render" : "Waiting"}
            </span>
          </div>
        </div>
      </div>

      {/* Studio Workspace Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setActiveTab("storyboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "storyboard"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Film size={14} /> Scene Storyboard ({scenes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("script")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "script"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileText size={14} /> Script & Narrative
          </button>

          {project.script?.researchDossier && (
            <button
              type="button"
              onClick={() => setActiveTab("research")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "research"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Sparkles size={14} className="text-purple-400" /> Deep Research Dossier
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("production")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "production"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers size={14} /> Production Hub
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "export"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Video size={14} /> Video Player & Export
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {/* TAB 1: SCENE STORYBOARD */}
        {activeTab === "storyboard" && (
          <div className="space-y-4">
            {!hasScript ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                <FileText className="mx-auto text-slate-300" size={40} />
                <h3 className="font-bold text-slate-800 text-base">No Scenes Available Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click below to trigger the AI Scriptwriter & Deep Research Engine.
                </p>
                <form action={triggerScriptAgent} className="pt-2">
                  <SubmitButton
                    pendingText="Generating Script..."
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles size={14} /> Generate Script & Scenes
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <>
                {/* Chapter Filters & View Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  {/* Chapter Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedChapter("ALL")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedChapter === "ALL"
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      All Scenes ({scenes.length})
                    </button>
                    {chapters.map((chap, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setSelectedChapter(chap)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          selectedChapter === chap
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Ch {i + 1}: {chap}
                      </button>
                    ))}
                  </div>

                  {/* Grid vs List View Mode */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400"
                      }`}
                      title="Grid View"
                    >
                      <Grid size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        viewMode === "list" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400"
                      }`}
                      title="List View"
                    >
                      <List size={15} />
                    </button>
                  </div>
                </div>

                {/* SCENES: GRID VIEW */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredScenes.map((scene: any) => {
                      const asset = scene.assets?.[0];
                      const hasAssetMedia = asset?.sourceUrl || asset?.localPath;

                      return (
                        <div
                          key={scene.id}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all overflow-hidden flex flex-col justify-between"
                        >
                          {/* Visual Media Header / Thumbnail */}
                          <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                            {hasAssetMedia && asset.type === "STOCK_IMAGE" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={asset.sourceUrl}
                                alt={`Scene ${scene.sceneIndex + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : hasAssetMedia && asset.type === "STOCK_VIDEO" ? (
                              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                                <Video size={24} className="text-blue-400 mb-1" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                  Stock Video Clip
                                </span>
                              </div>
                            ) : (
                              <div className="text-center p-4">
                                <Sparkles size={20} className="text-slate-600 mx-auto mb-1" />
                                <span className="text-[10px] text-slate-500 font-medium">Pending Visual</span>
                              </div>
                            )}

                            {/* Scene Number & Duration Badges */}
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold">
                                #{scene.sceneIndex + 1}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-slate-200 text-[10px] font-medium">
                                {scene.voiceover?.duration || scene.duration}s
                              </span>
                            </div>

                            {/* Visual Role Pill */}
                            <div className="absolute bottom-2 left-2">
                              <span className="px-2 py-0.5 rounded-full bg-blue-600/90 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider">
                                {scene.visualSource || "Visual"}
                              </span>
                            </div>
                          </div>

                          {/* Narration & Chapter Details */}
                          <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              {scene.chapterTitle && (
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide block mb-1">
                                  {scene.chapterTitle}
                                </span>
                              )}
                              <p className="text-xs text-slate-800 line-clamp-3 leading-relaxed font-medium">
                                &ldquo;{scene.narrationText}&rdquo;
                              </p>
                            </div>

                            {/* Footer Inspector Button */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">
                                {scene.subtitles?.length || 0} Subtitle Chunks
                              </span>
                              <button
                                type="button"
                                onClick={() => setInspectedScene(scene)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                              >
                                Inspect <Info size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SCENES: COMPACT LIST VIEW */}
                {viewMode === "list" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Narration Spoken</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Source</th>
                            <th className="px-4 py-3">Duration</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredScenes.map((scene: any) => (
                            <tr key={scene.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {scene.sceneIndex + 1}
                              </td>
                              <td className="px-4 py-3 max-w-md font-medium text-slate-800">
                                {scene.narrationText}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  {scene.visualRole}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                                  {scene.visualSource}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {scene.voiceover?.duration || scene.duration}s
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setInspectedScene(scene)}
                                  className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Slide-over Modal for Scene Inspection */}
            <AnimatePresence>
              {inspectedScene && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          Scene {inspectedScene.sceneIndex + 1} Technical Inspector
                        </h3>
                        <span className="text-xs text-slate-500">
                          Duration: {inspectedScene.voiceover?.duration || inspectedScene.duration}s
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedScene(null)}
                        className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    <SceneInspectorCard scene={inspectedScene} />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TAB 2: SCRIPT & NARRATIVE */}
        {activeTab === "script" && (
          <div className="space-y-6">
            <ScriptPanel
              script={project.script}
              status={project.status}
              onGenerateAction={triggerScriptAgent}
            />
          </div>
        )}

        {/* TAB 3: DEEP RESEARCH DOSSIER */}
        {activeTab === "research" && project.script?.researchDossier && (
          <div className="space-y-6">
            <ResearchPanel dossier={project.script.researchDossier as any} />
          </div>
        )}

        {/* TAB 4: PRODUCTION HUB */}
        {activeTab === "production" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <VoiceoverPanel
                status={project.status}
                scenes={scenes}
                onGenerateAction={triggerVoiceoverAgent}
              />
            </div>

            <div className="space-y-4">
              <AssetPanel
                status={project.status}
                scenes={scenes}
                onGenerateAction={triggerAssetAgent}
              />
            </div>

            <div className="space-y-4">
              <SubtitlePanel
                status={project.status}
                scenes={scenes}
                onGenerateAction={triggerSubtitleAgent}
              />
            </div>
          </div>
        )}

        {/* TAB 5: FINAL VIDEO & EXPORT */}
        {activeTab === "export" && (
          <div className="space-y-6">
            <ExportPanel
              status={project.status}
              exportJobs={project.exportJobs || []}
              onGenerateAction={triggerVideoAgent}
            />
          </div>
        )}
      </div>
    </div>
  );
}
