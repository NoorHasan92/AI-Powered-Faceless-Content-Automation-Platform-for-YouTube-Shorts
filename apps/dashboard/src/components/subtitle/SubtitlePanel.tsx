// File Location: src/components/subtitle/SubtitlePanel.tsx
import { Type, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Scene, SubtitleChunk } from "@prisma/client";

interface SceneWithSubtitles extends Scene {
  subtitles: SubtitleChunk[];
}

interface SubtitlePanelProps {
  status: string;
  scenes: SceneWithSubtitles[];
  onGenerateAction: (payload: FormData) => void;
}

export default function SubtitlePanel({ status, scenes, onGenerateAction }: SubtitlePanelProps) {
  const hasSubtitles = scenes.some(s => s.subtitles.length > 0);
  const isVoiceoverReady = scenes.every(s => s.duration > 0); // basic check if VOs exist
  const canGenerate = scenes.length > 0 && isVoiceoverReady && (status === "IN_PRODUCTION" || status === "EXPORT_QUEUED");

  return (
    <SectionCard title="Subtitle Extraction" icon={Type} iconColor="text-pink-500">
      {!hasSubtitles ? (
        <div className="py-4 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            {canGenerate 
              ? "Ready to extract and time-align captions for the video."
              : "Complete the voiceover phase to unlock subtitle alignment."}
          </p>

          {canGenerate && (
            <form action={onGenerateAction}>
              <SubmitButton
                pendingText="Aligning Captions..."
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm"
              >
                <RefreshCw size={16} /> Generate Subtitles
              </SubmitButton>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-slate-500">Caption Chunks Generated</span>
            <form action={onGenerateAction}>
               <SubmitButton
                  pendingText="Regenerating..."
                  className="text-xs text-pink-600 hover:text-pink-700 bg-pink-50 px-2 py-1 rounded"
                >
                  Regenerate All
                </SubmitButton>
            </form>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {scenes.sort((a, b) => a.sceneIndex - b.sceneIndex).map(scene => (
              <div key={scene.id} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700">Scene {scene.sceneIndex + 1}</span>
                  <span className="text-xs text-slate-500">{scene.subtitles.length} chunks</span>
                </div>
                {scene.subtitles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {scene.subtitles.map(chunk => (
                      <span key={chunk.id} className="bg-white px-1.5 py-0.5 rounded text-[10px] text-slate-600 border border-slate-200 uppercase tracking-wide">
                        {chunk.text}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertCircle size={14} /> <span className="text-xs">No subtitles</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
