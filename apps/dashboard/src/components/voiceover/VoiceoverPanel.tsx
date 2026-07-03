// File Location: src/components/voiceover/VoiceoverPanel.tsx
import { Mic, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Scene, Voiceover } from "@prisma/client";

interface SceneWithVoiceover extends Scene {
  voiceover: Voiceover | null;
}

interface VoiceoverPanelProps {
  status: string;
  scenes: SceneWithVoiceover[];
  onGenerateAction: (payload: FormData) => void;
}

export default function VoiceoverPanel({ status, scenes, onGenerateAction }: VoiceoverPanelProps) {
  const hasVoiceovers = scenes.some(s => s.voiceover !== null);
  const isScriptReady = status === "SCRIPT_READY" || status === "IN_PRODUCTION";
  const canGenerate = scenes.length > 0 && isScriptReady;

  return (
    <SectionCard title="Voiceover Generation" icon={Mic} iconColor="text-indigo-500">
      {!hasVoiceovers ? (
        <div className="py-4 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            {canGenerate 
              ? "Ready to generate Text-to-Speech audio for all scenes."
              : "Complete the script phase to unlock voiceovers."}
          </p>

          {canGenerate && (
            <form action={onGenerateAction}>
              <SubmitButton
                pendingText="Synthesizing Audio..."
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm"
              >
                <RefreshCw size={16} /> Generate Voiceovers
              </SubmitButton>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-slate-500">TTS Provider: Mock</span>
            <form action={onGenerateAction}>
               <SubmitButton
                  pendingText="Regenerating..."
                  className="text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded"
                >
                  Regenerate All
                </SubmitButton>
            </form>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {scenes.sort((a, b) => a.sceneIndex - b.sceneIndex).map(scene => (
              <div key={scene.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded text-sm">
                <span className="font-medium text-slate-700">Scene {scene.sceneIndex + 1}</span>
                <div className="flex items-center gap-3">
                  {scene.voiceover ? (
                    <>
                      <span className="text-xs text-slate-500">{scene.voiceover.duration}s</span>
                      <CheckCircle2 size={16} className="text-green-500" />
                    </>
                  ) : (
                    <AlertCircle size={16} className="text-amber-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
