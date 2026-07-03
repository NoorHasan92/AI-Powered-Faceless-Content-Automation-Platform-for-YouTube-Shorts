// File Location: src/app/page.tsx
// This file renders the main dashboard overview as a Server Component.
// It fetches real-time aggregate metrics from the Prisma database to display SaaS statistics.

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PlaySquare, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export default async function Home() {
  // Run all database queries in parallel for maximum speed
  const [activeProjects, totalVideos, pendingUploads, recentProjects] = await Promise.all([
    // 1. Count projects that are currently in progress
    prisma.project.count({
      where: {
        status: { notIn: ["COMPLETED", "FAILED", "DRAFT"] },
      },
    }),
    // 2. Count all rendered videos
    prisma.video.count(),
    // 3. Count videos sitting in the publishing queue
    prisma.video.count({
      where: { publishStatus: "SCHEDULED" },
    }),
    // 4. Get the 5 most recently updated projects
    prisma.project.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

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
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                      project.status === "COMPLETED"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : project.status === "FAILED"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {project.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}