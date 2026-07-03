// File Location: src/app/analytics/page.tsx
// Displays aggregate video performance metrics from the database.
// Will be connected to YouTube Data API analytics in a future module.

import { prisma } from "@/lib/prisma";
import { BarChart2, Film, Clock, Upload, TrendingUp } from "lucide-react";

export default async function AnalyticsPage() {
  const [totalVideos, publishedCount, scheduledCount, completedProjects] = await Promise.all([
    prisma.video.count(),
    prisma.video.count({ where: { publishStatus: "PUBLISHED" } }),
    prisma.video.count({ where: { publishStatus: "SCHEDULED" } }),
    prisma.project.count({ where: { status: "COMPLETED" } }),
  ]);

  const stats = [
    { label: "Total Videos", value: totalVideos, icon: Film, color: "text-blue-600 bg-blue-50 border-blue-100" },
    { label: "Published", value: publishedCount, icon: Upload, color: "text-green-600 bg-green-50 border-green-100" },
    { label: "Scheduled", value: scheduledCount, icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-100" },
    { label: "Completed Pipelines", value: completedProjects, icon: TrendingUp, color: "text-purple-600 bg-purple-50 border-purple-100" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Track your content performance across platforms.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-500">{label}</h3>
              <div className={`p-2 rounded-lg border ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder for future YouTube integration */}
      <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center">
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <BarChart2 className="text-slate-400" size={28} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">YouTube Analytics Coming Soon</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm leading-relaxed">
          Connect your YouTube account in Settings to start tracking views, likes, comments,
          and audience retention metrics for each published short.
        </p>
        <div className="mt-6 flex justify-center gap-6 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">📊 Views &amp; Impressions</span>
          <span className="flex items-center gap-1.5">👍 Engagement Rate</span>
          <span className="flex items-center gap-1.5">⏱️ Watch Time</span>
        </div>
      </div>
    </div>
  );
}
