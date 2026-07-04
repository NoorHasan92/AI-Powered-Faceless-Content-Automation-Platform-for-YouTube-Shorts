// File Location: src/components/script/ScriptPanel.tsx
import { RefreshCw, FileText } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Script } from "@prisma/client";
import type { CreativeBrief } from "@/validations/script.schema";

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
              <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 bg-white/90 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-slate-200 md:border-none z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none">
                <SubmitButton
                  pendingText="AI is writing..."
                  className="w-full md:w-auto flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 md:py-2 px-4 rounded-lg text-sm md:text-sm transition-colors shadow-sm"
                >
                  <RefreshCw size={16} className="md:w-3.5 md:h-3.5" /> Trigger AI Script Agent
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4 text-sm text-slate-700">
          {script.creativeBrief && (() => {
            const brief = script.creativeBrief as unknown as CreativeBrief;
            return (
              <details className="bg-slate-50 border border-slate-200 rounded-lg group">
                <summary className="p-3 font-semibold text-slate-600 text-[11px] uppercase tracking-wider cursor-pointer list-none flex items-center justify-between hover:bg-slate-100 transition-colors rounded-lg">
                  <span>Locked Creative Brief (Stage 1)</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-4 pt-2 border-t border-slate-200 text-xs space-y-3">
                  <div>
                    <span className="font-semibold text-slate-700 block">Core Topic</span>
                    <span className="text-slate-600">{brief.coreTopic}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold text-slate-700 block">Audience</span>
                      <span className="text-slate-600">{brief.audienceContext}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 block">Angle & Style</span>
                      <span className="text-slate-600">{brief.contentAngle} • {brief.endingStyle}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold text-green-700 block">Required Anchors</span>
                      <ul className="list-disc list-inside text-green-600 space-y-0.5">
                        {brief.requiredAnchors.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-red-700 block">Forbidden Drift Topics</span>
                      <ul className="list-disc list-inside text-red-600 space-y-0.5">
                        {brief.forbiddenDriftTopics.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  </div>
                  {brief.contentConstraints && brief.contentConstraints.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-700 block">Content Constraints</span>
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                        {brief.contentConstraints.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            );
          })()}

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

          {status !== "FAILED" && (
            <div className="pt-4 border-t border-slate-100 flex justify-end mt-2">
              <form action={onGenerateAction} className="w-full md:w-auto">
                <SubmitButton
                  pendingText="Regenerating..."
                  className="w-full justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 md:py-1.5 px-3 rounded-lg text-sm md:text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Regenerate Script
                </SubmitButton>
              </form>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
