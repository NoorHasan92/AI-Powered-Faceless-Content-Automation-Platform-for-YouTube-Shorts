// File Location: src/app/analytics/page.tsx
// Displays aggregate video performance metrics from internal DB and live YouTube API.

import { cookies } from "next/headers";
import { getAnalyticsData } from "@/services/analytics.service";
import AnalyticsCharts from "@/components/analytics/AnalyticsCharts";
import { Film, TrendingUp, CheckCircle, AlertTriangle, Eye, ThumbsUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("yt_access_token")?.value;
  const refreshToken = cookieStore.get("yt_refresh_token")?.value;

  const data = await getAnalyticsData(accessToken, refreshToken);
  const { internal, youtube } = data;

  const kpis = [
    { label: "Total Projects", value: internal.totalProjects, icon: Film, color: "text-blue-600 bg-blue-50 border-blue-100" },
    { label: "Pipeline Success", value: `${internal.successRate}%`, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { label: "YouTube Views", value: youtube.totalViews.toLocaleString(), icon: Eye, color: "text-red-600 bg-red-50 border-red-100" },
    { label: "YouTube Likes", value: youtube.totalLikes.toLocaleString(), icon: ThumbsUp, color: "text-amber-600 bg-amber-50 border-amber-100" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
        <p className="text-slate-500 mt-1">Hybrid pipeline and published performance metrics.</p>
      </header>

      {/* Graceful Fallback Warning for YouTube */}
      {youtube.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">YouTube Metrics Unavailable</h3>
            <p className="text-amber-700 text-sm mt-0.5">{youtube.error}</p>
          </div>
        </div>
      )}

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500">{label}</h3>
              <div className={`p-2 rounded-lg border ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Recharts Data Viz */}
      <AnalyticsCharts 
        pipelineTrend={internal.pipelineTrend} 
        projectsByNiche={internal.projectsByNiche} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Performing Videos Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Top Performing Videos</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-5 py-3 rounded-tl-xl">Video</th>
                  <th className="px-5 py-3">Views</th>
                  <th className="px-5 py-3">Likes</th>
                  <th className="px-5 py-3">Comments</th>
                  <th className="px-5 py-3 rounded-tr-xl">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {youtube.topVideos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No published videos available to track.
                    </td>
                  </tr>
                ) : (
                  youtube.topVideos.map((video) => (
                    <tr key={video.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt={video.title} className="w-16 h-10 object-cover rounded shadow-sm" />
                          ) : (
                            <div className="w-16 h-10 bg-slate-200 rounded shadow-sm flex items-center justify-center">
                              <Film size={16} className="text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900 max-w-[200px] truncate" title={video.title}>
                              {video.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {video.publishedAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{video.views.toLocaleString()}</td>
                      <td className="px-5 py-4 text-slate-600">{video.likes.toLocaleString()}</td>
                      <td className="px-5 py-4 text-slate-600">{video.comments.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <a 
                          href={`https://youtube.com/shorts/${video.youtubeId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 p-2 block"
                          title="View on YouTube"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Pipeline Runs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recent Pipeline Runs</h3>
            <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            {internal.recentRuns.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No recent activity.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {internal.recentRuns.map((run) => (
                  <li key={run.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <Link href={`/projects/${run.id}`} className="block">
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="font-medium text-slate-900 text-sm truncate pr-4">{run.title}</h4>
                        <span className="text-xs text-slate-400 shrink-0">
                          {run.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <StatusBadge status={run.status} className="scale-90 origin-left" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
