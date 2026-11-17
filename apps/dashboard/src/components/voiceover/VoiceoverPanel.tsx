// File Location: src/components/voiceover/VoiceoverPanel.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  Square,
  Loader2,
  Sparkles,
  Volume2,
} from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SubmitButton from "@/components/ui/SubmitButton";
import { generateVoiceoverAction, generateSingleVoiceoverAction } from "@/actions/voiceover.actions";
import type { Scene, Voiceover } from "@prisma/client";

interface SceneWithVoiceover extends Scene {
  voiceover: Voiceover | null;
}

interface VoiceoverPanelProps {
  status: string;
  scenes: SceneWithVoiceover[];
  projectId?: string;
  onGenerateAction: (payload: FormData) => void;
}

export default function VoiceoverPanel({
  status,
  scenes,
  projectId,
  onGenerateAction,
}: VoiceoverPanelProps) {
  const router = useRouter();
  const [loadingSceneId, setLoadingSceneId] = useState<string | null>(null);
  const [isBulkRegenerating, setIsBulkRegenerating] = useState(false);
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const completedScenes = scenes.filter(
    (s) => s.voiceover !== null && s.voiceover.status === "COMPLETED" && (s.voiceover.duration ?? 0) > 0
  );
  const isAllCompleted = completedScenes.length === scenes.length && scenes.length > 0;
  const hasSomeVoiceovers = completedScenes.length > 0;
  const missingCount = scenes.length - completedScenes.length;
  const percentCompleted = scenes.length > 0 ? Math.round((completedScenes.length / scenes.length) * 100) : 0;

  const isScriptReady = status === "SCRIPT_READY" || status === "IN_PRODUCTION";
  const canGenerate = scenes.length > 0 && isScriptReady;

  // Audio preview toggle
  const togglePlayAudio = (sceneId: string, url: string) => {
    if (playingSceneId === sceneId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingSceneId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingSceneId(sceneId);
    audio.play().catch(() => setPlayingSceneId(null));
    audio.onended = () => {
      setPlayingSceneId(null);
      audioRef.current = null;
    };
  };

  // Generate or retry audio for a single scene
  const handleSingleSceneGenerate = async (sceneId: string) => {
    if (!projectId) return;
    setLoadingSceneId(sceneId);
    try {
      await generateSingleVoiceoverAction(projectId, sceneId);
      router.refresh();
    } catch (err) {
      console.error("Single scene TTS failed:", err);
    } finally {
      setLoadingSceneId(null);
    }
  };

  // Force regenerate all scenes
  const handleForceRegenerateAll = async () => {
    if (!projectId) return;
    if (!confirm("Regenerate audio for ALL scenes from scratch?")) return;
    setIsBulkRegenerating(true);
    try {
      await generateVoiceoverAction(projectId, true);
      router.refresh();
    } catch (err) {
      console.error("Force regenerate failed:", err);
    } finally {
      setIsBulkRegenerating(false);
    }
  };

  return (
    <SectionCard title="Voiceover Generation" icon={Mic} iconColor="text-indigo-500">
      {!hasSomeVoiceovers ? (
        <div className="py-5 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            {canGenerate
              ? "Ready to generate Edge-TTS neural speech for all scenes."
              : "Complete the script phase to unlock voiceovers."}
          </p>

          {canGenerate && (
            <form action={onGenerateAction}>
              <SubmitButton
                pendingText="Synthesizing Audio..."
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} /> Generate Voiceovers
              </SubmitButton>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Header Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Edge-TTS Neural</span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  isAllCompleted
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {completedScenes.length}/{scenes.length} Audio Synced ({percentCompleted}%)
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {projectId && (
                <button
                  type="button"
                  onClick={handleForceRegenerateAll}
                  disabled={isBulkRegenerating}
                  className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isBulkRegenerating ? "Regenerating..." : "Regenerate All"}
                </button>
              )}
            </div>
          </div>

          {/* Prompt to generate remaining if partially complete */}
          {!isAllCompleted && (
            <form action={onGenerateAction} className="pt-1">
              <SubmitButton
                pendingText="Synthesizing Remaining..."
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={13} /> Resume & Generate Missing ({missingCount} remaining)
              </SubmitButton>
            </form>
          )}

          {/* Scene List */}
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {scenes
              .sort((a, b) => a.sceneIndex - b.sceneIndex)
              .map((scene) => {
                const hasVoice = scene.voiceover !== null && (scene.voiceover.duration ?? 0) > 0;
                const isLoadingThis = loadingSceneId === scene.id;
                const isPlayingThis = playingSceneId === scene.id;

                return (
                  <div
                    key={scene.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      hasVoice
                        ? "bg-slate-50/80 border-slate-200/80 hover:bg-white"
                        : "bg-amber-50/60 border-amber-200/90"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <span className="font-bold text-slate-800 shrink-0">
                        Scene {scene.sceneIndex + 1}
                      </span>
                      <p className="text-slate-500 truncate text-[11px]">
                        {scene.narrationText}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasVoice ? (
                        <>
                          <span className="text-[11px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {scene.voiceover?.duration}s
                          </span>

                          {scene.voiceover?.audioUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                togglePlayAudio(scene.id, scene.voiceover!.audioUrl!)
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isPlayingThis
                                  ? "bg-indigo-600 text-white animate-pulse"
                                  : "text-slate-500 hover:bg-slate-200/80"
                              }`}
                              title={isPlayingThis ? "Stop audio" : "Listen to scene voiceover"}
                            >
                              {isPlayingThis ? <Square size={12} /> : <Volume2 size={12} />}
                            </button>
                          )}

                          <CheckCircle2 size={15} className="text-emerald-500" />

                          {projectId && (
                            <button
                              type="button"
                              onClick={() => handleSingleSceneGenerate(scene.id)}
                              disabled={isLoadingThis}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                              title="Re-record this scene"
                            >
                              {isLoadingThis ? (
                                <Loader2 size={12} className="animate-spin text-indigo-600" />
                              ) : (
                                <RefreshCw size={12} />
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <AlertCircle size={15} className="text-amber-500" />
                          {projectId && (
                            <button
                              type="button"
                              onClick={() => handleSingleSceneGenerate(scene.id)}
                              disabled={isLoadingThis}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                            >
                              {isLoadingThis ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                "Generate"
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
