// File Location: src/app/page.tsx
// This file renders the main dashboard overview as a Server Component.
// It fetches real-time aggregate metrics from the Prisma database to display SaaS statistics.

import Link from "next/link";
import { PlaySquare, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { getDashboardStats, getRecentProjects } from "@/services/project.service";
import StatusBadge from "@/components/ui/StatusBadge";

export default async function Home() {
  const { activeProjects, totalVideos, pendingUploads } = await getDashboardStats();
  const recentProjects = await getRecentProjects(5);

  const stats = [
    { label: "Active Pipelines", value: activeProjects, icon: Clock, accent: "text-blue-600 bg-blue-50 border-blue-100" },
    { label: "Videos Generated", value: totalVideos, icon: CheckCircle, accent: "text-green-600 bg-green-50 border-green-100" },
    { label: "Pending Uploads", value: pendingUploads, icon: PlaySquare, accent: "text-purple-600 bg-purple-50 border-purple-100" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome to your content automation pipeline.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</h3>
              <div className={`p-2 rounded-lg border ${accent}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Feed */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
        {recentProjects.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
            <PlaySquare className="mx-auto text-slate-300 mb-3" size={36} />
            <p className="text-slate-500 text-sm">No projects yet. Head to the Projects tab to start one!</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recentProjects.map((project) => (
                <Link
                  href={`/projects/${project.id}`}
                  key={project.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{project.title}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {project.niche} • {project.tone}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}