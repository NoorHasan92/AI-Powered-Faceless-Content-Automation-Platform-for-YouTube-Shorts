// File Location: src/services/analytics.service.ts
// Aggregates internal pipeline metrics and live YouTube performance data.

import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { getOAuth2Client } from "./youtube.service";

export interface AnalyticsPayload {
  internal: {
    totalProjects: number;
    completedPipelines: number;
    failedPipelines: number;
    successRate: number;
    projectsByNiche: { name: string; value: number }[];
    pipelineTrend: { date: string; created: number; completed: number }[];
    recentRuns: { id: string; title: string; status: string; createdAt: Date }[];
  };
  youtube: {
    connected: boolean;
    error: string | null;
    totalViews: number;
    totalLikes: number;
    topVideos: YouTubeVideoMetric[];
  };
}

export interface YouTubeVideoMetric {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  publishedAt: Date;
  views: number;
  likes: number;
  comments: number;
}

export async function getAnalyticsData(
  accessToken?: string,
  refreshToken?: string
): Promise<AnalyticsPayload> {
  // ---------------------------------------------------------
  // 1. Fetch Internal Pipeline Metrics
  // ---------------------------------------------------------
  
  const [totalProjects, completedPipelines, failedPipelines, recentRuns, allProjects] = await Promise.all([
    prisma.project.count({ where: { isArchived: false } }),
    prisma.project.count({ where: { status: "COMPLETED", isArchived: false } }),
    prisma.project.count({ where: { status: "FAILED", isArchived: false } }),
    prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, createdAt: true },
      where: { isArchived: false }
    }),
    prisma.project.findMany({
      where: { isArchived: false },
      select: { niche: true, createdAt: true, status: true },
    })
  ]);

  const successRate = totalProjects > 0 
    ? Math.round((completedPipelines / (completedPipelines + failedPipelines || 1)) * 100) 
    : 0;

  // Aggregate Projects by Niche
  const nicheMap: Record<string, number> = {};
  allProjects.forEach(p => {
    const niche = p.niche || "Other";
    nicheMap[niche] = (nicheMap[niche] || 0) + 1;
  });
  const projectsByNiche = Object.entries(nicheMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Aggregate Pipeline Trend (Last 7 Days)
  const trendMap: Record<string, { created: number; completed: number }> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    trendMap[dateStr] = { created: 0, completed: 0 };
  }

  allProjects.forEach(p => {
    const dateStr = p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (trendMap[dateStr]) {
      trendMap[dateStr].created += 1;
      if (p.status === "COMPLETED") {
        trendMap[dateStr].completed += 1;
      }
    }
  });

  const pipelineTrend = Object.entries(trendMap).map(([date, data]) => ({
    date,
    created: data.created,
    completed: data.completed,
  }));

  const internalMetrics = {
    totalProjects,
    completedPipelines,
    failedPipelines,
    successRate,
    projectsByNiche,
    pipelineTrend,
    recentRuns,
  };

  // ---------------------------------------------------------
  // 2. Fetch Live YouTube Metrics
  // ---------------------------------------------------------
  
  const publishedVideos = await prisma.video.findMany({
    where: { publishStatus: "PUBLISHED", youtubeId: { not: null } },
    include: { project: { select: { title: true } } }
  });

  const youtubeMetrics = {
    connected: false,
    error: null as string | null,
    totalViews: 0,
    totalLikes: 0,
    topVideos: [] as YouTubeVideoMetric[],
  };

  if (publishedVideos.length === 0) {
    youtubeMetrics.error = "No videos published yet.";
    return { internal: internalMetrics, youtube: youtubeMetrics };
  }

  if (!accessToken || !refreshToken) {
    youtubeMetrics.error = "Not connected to YouTube. Connect in Settings to see live views.";
    return { internal: internalMetrics, youtube: youtubeMetrics };
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // YouTube API allows requesting up to 50 IDs at a time.
    const youtubeIds = publishedVideos.map(v => v.youtubeId!).slice(0, 50).join(",");

    const response = await youtube.videos.list({
      part: ["snippet", "statistics"],
      id: [youtubeIds]
    });

    const items = response.data.items || [];
    youtubeMetrics.connected = true;

    for (const videoRecord of publishedVideos) {
      const ytData = items.find(item => item.id === videoRecord.youtubeId);
      if (!ytData) continue;

      const stats = ytData.statistics;
      const snippet = ytData.snippet;
      
      const views = parseInt(stats?.viewCount || "0", 10);
      const likes = parseInt(stats?.likeCount || "0", 10);
      const comments = parseInt(stats?.commentCount || "0", 10);

      youtubeMetrics.totalViews += views;
      youtubeMetrics.totalLikes += likes;

      youtubeMetrics.topVideos.push({
        id: videoRecord.id,
        youtubeId: videoRecord.youtubeId!,
        title: snippet?.title || videoRecord.project.title,
        thumbnail: snippet?.thumbnails?.maxres?.url || snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || "",
        publishedAt: videoRecord.publishedAt || new Date(snippet?.publishedAt || ""),
        views,
        likes,
        comments
      });
    }

    youtubeMetrics.topVideos.sort((a, b) => b.views - a.views);

  } catch (error: any) {
    console.error("Failed to fetch live YouTube analytics:", error);
    youtubeMetrics.error = "Failed to fetch YouTube metrics. Token may be expired.";
  }

  return { internal: internalMetrics, youtube: youtubeMetrics };
}
