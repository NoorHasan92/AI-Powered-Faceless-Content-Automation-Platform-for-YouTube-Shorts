// File Location: src/components/project/ResearchPanel.tsx
// Displays the Deep Research Dossier for long-form / documentary projects.

import React from "react";
import { Compass, TrendingUp, Users, BookmarkCheck, Calendar, Film, Lightbulb } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import type { ResearchDossier } from "@/services/research.service";

interface ResearchPanelProps {
  dossier: ResearchDossier | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TIMELINE: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  STATISTIC: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  MECHANISM: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  QUOTE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  MYTH_BUST: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const ACT_BADGES: Record<string, string> = {
  COLD_OPEN: "bg-amber-100 text-amber-800",
  INVESTIGATION: "bg-blue-100 text-blue-800",
  ESCALATION: "bg-purple-100 text-purple-800",
  TURNING_POINT: "bg-indigo-100 text-indigo-800",
  CLIMAX: "bg-rose-100 text-rose-800",
  AFTERMATH: "bg-slate-100 text-slate-800",
};

export default function ResearchPanel({ dossier }: ResearchPanelProps) {
  if (!dossier) return null;

  return (
    <SectionCard title="Deep Research Dossier" icon={Compass} iconColor="text-indigo-600">
      <div className="space-y-6 text-sm text-slate-700">
        
        {/* Core Premise */}
        {dossier.corePremise && (
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">
              Core Video Premise & Unique Angle
            </span>
            <p className="text-slate-800 font-medium leading-relaxed">
              {dossier.corePremise}
            </p>
          </div>
        )}

        {/* YouTube Trend Demand */}
        {dossier.youtubeTrends && dossier.youtubeTrends.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
              <TrendingUp size={14} className="text-red-500" /> Live YouTube Search Demand
            </div>
            <div className="flex flex-wrap gap-2">
              {dossier.youtubeTrends.map((trend, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                >
                  {trend}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Competitor Gap Analysis */}
        {dossier.competitorAnalysis && dossier.competitorAnalysis.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
              <Users size={14} className="text-blue-500" /> Competitor Gap Analysis
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dossier.competitorAnalysis.map((comp, i) => (
                <div key={i} className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <span className="font-semibold text-slate-900 text-xs block">
                    "{comp.viralTitle}"
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="text-slate-500">
                      <strong className="text-slate-700">Curiosity Gap:</strong> {comp.audienceCuriosityGap}
                    </p>
                    <p className="text-emerald-700 font-medium bg-emerald-50/80 p-2 rounded border border-emerald-100">
                      <strong>Our Edge:</strong> {comp.unaddressedOpportunity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Act Narrative Chapters */}
        {dossier.chapters && dossier.chapters.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
              <Film size={14} className="text-purple-500" /> Multi-Act Chapter Architecture
            </div>
            <div className="space-y-2.5">
              {dossier.chapters.map((ch, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">
                        Act {ch.chapterIndex}: {ch.title}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${ACT_BADGES[ch.actType] || "bg-slate-200 text-slate-800"}`}>
                        {ch.actType.replace("_", " ")}
                      </span>
                      {ch.estimatedMinutes && (
                        <span className="text-[11px] text-slate-400">
                          ~{ch.estimatedMinutes} min
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Goal:</strong> {ch.narrativeGoal}
                    </p>
                    {ch.keyFactsToCover && ch.keyFactsToCover.length > 0 && (
                      <div className="text-xs text-slate-500 pt-1">
                        <strong>Key Facts:</strong> {ch.keyFactsToCover.join(" • ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Factual Dossier */}
        {dossier.factualDossier && dossier.factualDossier.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
              <BookmarkCheck size={14} className="text-emerald-500" /> Verified Factual Dossier
            </div>
            <div className="space-y-2">
              {dossier.factualDossier.map((fact, i) => {
                const badge = CATEGORY_COLORS[fact.category] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
                return (
                  <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badge.bg} ${badge.text} ${badge.border}`}>
                        {fact.category}
                      </span>
                      <span className="font-semibold text-xs text-slate-900">
                        {fact.headline}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {fact.details}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chronological Timeline */}
        {dossier.chronologicalTimeline && dossier.chronologicalTimeline.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
              <Calendar size={14} className="text-amber-500" /> Chronological Timeline
            </div>
            <div className="border-l-2 border-indigo-200 ml-2 pl-4 space-y-3 py-1">
              {dossier.chronologicalTimeline.map((item, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                  <span className="font-semibold text-xs text-indigo-900 block">
                    {item.period}
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {item.event}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viral Hooks */}
        {dossier.viralHooks && dossier.viralHooks.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
              <Lightbulb size={14} className="text-amber-500" /> Retention Hooks
            </div>
            <div className="space-y-1.5">
              {dossier.viralHooks.map((hook, i) => (
                <div key={i} className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-950 font-medium">
                  <span className="font-bold text-amber-700 mr-1.5">Option {i + 1}:</span>
                  "{hook}"
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </SectionCard>
  );
}

