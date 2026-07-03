// File Location: src/components/script/ScriptPanel.tsx
import { RefreshCw, FileText } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Script } from "@prisma/client";

interface ScriptPanelProps {
  script: Script | null;
  status: string;
  onGenerateAction: (payload: FormData) => void;
}

export default function ScriptPanel({ script, status, onGenerateAction }: ScriptPanelProps) {
  return (
    <SectionCard title="AI Generated Script" icon={FileText} iconColor="text-blue-500">
      {!script ? (
        <div className="py-6 text-center space-y-3">
          <p className="text-slate-500 text-sm">
            No script generated for this project yet.
          </p>
          {status !== "FAILED" && (
            <form action={onGenerateAction}>
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
            <p className="text-slate-800">{script.hook}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800 text-xs uppercase tracking-wider block mb-1">
              Body Text
            </span>
            <p className="whitespace-pre-line text-slate-700">{script.bodyText}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <span className="font-semibold text-purple-800 text-xs uppercase tracking-wider block mb-1">
              Call to Action (CTA)
            </span>
            <p className="text-slate-800">{script.cta}</p>
          </div>
          
          {script.estimatedDuration && (
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Estimated Duration: {script.estimatedDuration}s
              </span>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
