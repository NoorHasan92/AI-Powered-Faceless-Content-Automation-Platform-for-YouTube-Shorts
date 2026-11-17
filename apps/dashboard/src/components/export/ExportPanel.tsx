// File Location: src/components/export/ExportPanel.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Film, Play, Download, CheckCircle2, Clock } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SubmitButton from "@/components/ui/SubmitButton";
import PublishButton from "@/components/export/PublishButton";
import type { ExportJob } from "@prisma/client";

interface ExportPanelProps {
  status: string;
  exportJobs: ExportJob[];
  onGenerateAction: (payload: FormData) => void;
}

export default function ExportPanel({ status, exportJobs, onGenerateAction }: ExportPanelProps) {
  const router = useRouter();
  const isProcessing = exportJobs.some((job) => job.status === "PROCESSING");

  // Auto-refresh the page every 4 seconds while any export job is rendering
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [isProcessing, router]);

  const canExport = status === "EXPORT_QUEUED" || status === "COMPLETED";

  return (
    <SectionCard title="Render Queue" icon={Film} iconColor="text-blue-500">
      {exportJobs.length === 0 ? (
        <div className="py-4 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            {canExport
              ? "Pipeline is ready. You can now compile the final video."
              : "Complete the pipeline phases to unlock video rendering."}
          </p>

          {canExport && (
            <form action={onGenerateAction}>
              <SubmitButton
                pendingText="Compiling Video..."
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm"
              >
                <Play size={16} /> Run Video Composer Agent
              </SubmitButton>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {exportJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((job) => (
            <div
              key={job.id}
              className={`p-4 rounded-lg border text-sm space-y-3 ${
                job.status === "COMPLETED"
                  ? "bg-green-50 border-green-200"
                  : job.status === "FAILED"
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex justify-between items-center border-b border-black/5 pb-2">
                <p className="font-bold flex items-center gap-2 text-slate-800">
                  <Film size={16} /> Export Job
                </p>
                <span className="px-2 py-1 bg-white/50 rounded text-xs font-semibold text-slate-700">
                  {job.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <p>Format: {job.resolution} {job.format.toUpperCase()}</p>
                <p>Duration: {job.duration ? `${job.duration}s` : "--"}</p>
                <p className="col-span-2">
                  Started: {job.startedAt?.toLocaleString()}
                </p>
              </div>

              {job.status === "COMPLETED" && job.outputUrl && (
                <div className="pt-2 flex gap-2">
                   <a 
                    href={job.outputUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 flex justify-center items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-3 rounded transition-colors"
                  >
                    <Download size={14} /> Download MP4
                  </a>
                  <PublishButton exportJobId={job.id} projectId={job.projectId} />
                </div>
              )}
              
              {job.status === "PROCESSING" && (
                <div className="pt-2 flex items-center justify-center gap-2 text-blue-600">
                  <Clock size={16} className="animate-spin" /> Rendering in progress...
                </div>
              )}
            </div>
          ))}
          
          <form action={onGenerateAction} className="pt-2">
            <SubmitButton
              pendingText="Queuing New Export..."
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg text-xs transition-colors"
            >
               Run Another Export
            </SubmitButton>
          </form>
        </div>
      )}
    </SectionCard>
  );
}
