// File Location: src/app/(dashboard)/page.tsx
// Executive SaaS Dashboard Overview with real-time metrics, quick launchers, and active pipelines.

import Link from "next/link";
import {
  PlaySquare,
  Clock,
  CheckCircle2,
  Sparkles,
  Smartphone,
  MonitorPlay,
  Flame,
  ArrowRight,
  TrendingUp,
  Cpu,
  Zap,
} from "lucide-react";
import { getDashboardStats, getRecentProjects } from "@/services/project.service";
import ProjectCard from "@/components/project/ProjectCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { activeProjects, totalVideos, pendingUploads } = await getDashboardStats();
  const recentProjects = await getRecentProjects(6);

  const stats = [
    {
      label: "Active Pipelines",
      value: activeProjects,
      desc: "In-progress automated workflows",
      icon: Clock,
      accent: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      label: "Videos Generated",
      value: totalVideos,
      desc: "1080p full renders completed",
      icon: CheckCircle2,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      label: "Ready to Publish",
      value: pendingUploads,
      desc: "Awaiting YouTube release",
      icon: PlaySquare,
      accent: "text-purple-600 bg-purple-50 border-purple-200",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Executive Welcome Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/20">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles size={13} className="text-blue-400" />
            AI-Powered Video Automation Suite
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Autonomous Faceless Video Studio
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Generate viral YouTube Shorts and multi-chapter 16:9 documentaries with Deep Research,
            Edge-TTS word-synced subtitles, and automated background music.
          </p>

          {/* Quick Action Launchers */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Zap size={14} /> Open Production Studio
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs py-2.5 px-4 rounded-xl border border-white/15 transition-all cursor-pointer"
            >
              <TrendingUp size={14} /> View Analytics
            </Link>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-blue-600/20 via-purple-600/10 to-transparent pointer-events-none" />
      </div>

      {/* Real-Time SaaS KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, desc, icon: Icon, accent }) => (
          <div
            key={label}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
              <div className={`p-2 rounded-xl border ${accent}`}>
                <Icon size={18} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
            <Flame size={16} />
          </div>
          <h4 className="font-bold text-xs text-slate-900">Live Trending Topics Radar</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Pulls live search signals from YouTube autocomplete & Google Trends to discover viral curiosity seeds.
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Cpu size={16} />
          </div>
          <h4 className="font-bold text-xs text-slate-900">Word-Boundary Subtitle Sync</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Captures WebSocket telemetry from Edge-TTS for sub-millisecond caption precision with zero drift.
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <MonitorPlay size={16} />
          </div>
          <h4 className="font-bold text-xs text-slate-900">Continuous Ducked BGM</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Royalty-free cinematic documentary pads mixed seamlessly under voiceovers with 12% ducked volume.
          </p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Pipelines</h2>
            <p className="text-xs text-slate-500">Your most recently generated video projects.</p>
          </div>
          <Link
            href="/projects"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            View All ({recentProjects.length}) <ArrowRight size={13} />
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
            <PlaySquare className="mx-auto text-slate-300 mb-2" size={36} />
            <p className="text-slate-600 text-sm font-semibold">No video projects yet</p>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Launch your first automated AI video by opening the studio.
            </p>
            <Link
              href="/projects"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Zap size={14} /> Create a Project
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project as any} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
