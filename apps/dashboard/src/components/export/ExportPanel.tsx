// File Location: src/components/export/ExportPanel.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Film,
  Play,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SubmitButton from "@/components/ui/SubmitButton";
import PublishButton from "@/components/export/PublishButton";
import { cancelExportAction } from "@/actions/export.actions";
import type { ExportJob } from "@prisma/client";

interface ExportPanelProps {
  status: string;
  exportJobs: ExportJob[];
  onGenerateAction: (payload: FormData) => void;
}

export default function ExportPanel({ status, exportJobs, onGenerateAction }: ExportPanelProps) {
  const router = useRouter();
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isProcessing = exportJobs.some((job) => job.status === "PROCESSING");

  // Auto-refresh the page every 2.5s while any export job is rendering so progress updates live
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [isProcessing, router]);

  const handleCancelExport = async (jobId: string, projectId: string) => {
    if (!confirm("Are you sure you want to cancel this video export? Any in-progress compilation will stop.")) {
      return;
    }
    setCancellingJobId(jobId);
    try {
      await cancelExportAction(jobId, projectId);
      router.refresh();
    } catch (err) {
      console.error("Failed to cancel export:", err);
    } finally {
      setCancellingJobId(null);
    }
  };

  const canExport = status === "EXPORT_QUEUED" || status === "COMPLETED";

  // Helper to generate dynamic progress narrative
  const getProgressStageDescription = (job: ExportJob) => {
    const progress = job.progress || 0;
    const current = job.currentScene || 1;
    const total = job.totalScenes || 1;

    if (progress >= 100) return "Video compilation completed!";
    if (progress >= 95) return "Finalizing and uploading high-definition MP4 to cloud storage...";
    if (progress >= 85) return "Concatenating scenes & mixing background audio track...";
    return `Rendering Scene ${current} of ${total} (FFmpeg 1080p + Subtitles)...`;
  };

  return (
    <SectionCard title="Render Queue" icon={Film} iconColor="text-blue-500">
      {exportJobs.length === 0 ? (
        <div className="py-6 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            {canExport
              ? "All scene assets and audio are ready. You can now compile the final 1080p video."
              : "Complete the previous pipeline phases to unlock video rendering."}
          </p>

          {canExport && (
            <form action={onGenerateAction}>
              <SubmitButton
                pendingText="Compiling Video..."
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={16} /> Run Video Composer Agent
              </SubmitButton>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {exportJobs
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((job) => {
              const isJobProcessing = job.status === "PROCESSING";
              const isJobCancelled = job.status === "CANCELLED";
              const isJobCompleted = job.status === "COMPLETED";
              const isJobFailed = job.status === "FAILED";
              const isCancelling = cancellingJobId === job.id;
              const displayProgress = Math.min(100, Math.max(0, job.progress || 0));

              return (
                <div
                  key={job.id}
                  className={`p-4 rounded-2xl border text-sm transition-all ${
                    isJobCompleted
                      ? "bg-emerald-50/70 border-emerald-200/90 shadow-2xs"
                      : isJobFailed
                      ? "bg-rose-50/70 border-rose-200/90"
                      : isJobCancelled
                      ? "bg-amber-50/60 border-amber-200/80 text-amber-900"
                      : "bg-gradient-to-b from-blue-50/80 to-indigo-50/50 border-blue-200/90 shadow-xs"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center border-b border-black/5 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isJobCompleted
                            ? "bg-emerald-600 text-white"
                            : isJobFailed
                            ? "bg-rose-600 text-white"
                            : isJobCancelled
                            ? "bg-amber-500 text-white"
                            : "bg-blue-600 text-white animate-pulse"
                        }`}
                      >
                        <Film size={15} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">
                          {isJobCompleted
                            ? "Render Completed"
                            : isJobProcessing
                            ? "Compiling Video..."
                            : isJobCancelled
                            ? "Compilation Cancelled"
                            : "Render Failed"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {job.resolution} • {job.format.toUpperCase()} • {job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : "--"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isJobCompleted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : isJobFailed
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : isJobCancelled
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5"
                        }`}
                      >
                        {isJobProcessing && <Loader2 size={12} className="animate-spin text-blue-600" />}
                        {job.status}
                      </span>
                    </div>
                  </div>

                  {/* ACTIVE RENDERING PROGRESS BAR & CANCEL BUTTON */}
                  {isJobProcessing && (
                    <div className="space-y-3 py-1">
                      {/* Progress Percentage & Status Label */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Clock size={14} className="text-blue-600 animate-spin" />
                          {getProgressStageDescription(job)}
                        </span>
                        <span className="font-black text-blue-700 text-sm bg-blue-100/80 px-2 py-0.5 rounded-md">
                          {displayProgress}%
                        </span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="w-full bg-slate-200/90 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-500 ease-out shadow-xs"
                          style={{ width: `${Math.max(6, displayProgress)}%` }}
                        />
                      </div>

                      {/* Scene count & Cancel Action Bar */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] text-slate-500">
                          {job.totalScenes ? (
                            <span>
                              Processing scene <strong className="text-slate-800">{job.currentScene || 1}</strong> of{" "}
                              <strong className="text-slate-800">{job.totalScenes}</strong>
                            </span>
                          ) : (
                            <span>Initializing pipeline worker...</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCancelExport(job.id, job.projectId)}
                          disabled={isCancelling}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isCancelling ? (
                            <>
                              <Loader2 size={13} className="animate-spin" /> Cancelling...
                            </>
                          ) : (
                            <>
                              <XCircle size={13} /> Cancel Compilation
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* COMPLETED STATUS ACTIONS */}
                  {isJobCompleted && job.outputUrl && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      <a
                        href={job.outputUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex justify-center items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-xl text-xs transition-colors shadow-xs"
                      >
                        <Download size={15} /> Download MP4 ({job.duration ? `${job.duration}s` : "Video"})
                      </a>
                      <PublishButton exportJobId={job.id} projectId={job.projectId} />
                    </div>
                  )}

                  {/* CANCELLED STATUS MESSAGE */}
                  {isJobCancelled && (
                    <div className="pt-1 text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Video compilation was cancelled by user.</p>
                        <p className="text-[11px] text-amber-700/80 mt-0.5">
                          You can start a new render anytime below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* FAILED STATUS MESSAGE */}
                  {isJobFailed && (
                    <div className="pt-1 text-xs text-rose-800 flex items-start gap-2">
                      <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Compilation encountered an error.</p>
                        {job.errorMessage && (
                          <p className="text-[11px] text-rose-700/90 mt-0.5 font-mono">
                            {job.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Trigger another export button */}
          {!isProcessing && (
            <form action={onGenerateAction} className="pt-2">
              <SubmitButton
                pendingText="Queuing New Export..."
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <Sparkles size={14} className="text-blue-600" /> Run Another Export
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </SectionCard>
  );
}
