// File Location: src/services/youtube.service.ts
// YouTube upload service using YouTube Data API v3 with OAuth2.
// Handles token management and video upload.

import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/lib/types";
import type { Video } from "@prisma/client";
import fs from "fs";

const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/youtube/callback`
  : "http://localhost:3000/api/auth/youtube/callback";

/**
 * Create an OAuth2 client instance.
 */
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI,
  );
}

/**
 * Generate the OAuth2 authorization URL for YouTube upload scope.
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
    ],
  });
}

/**
 * Exchange an authorization code for tokens and store them.
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Upload a video to YouTube using stored OAuth2 tokens.
 *
 * Flow:
 * 1. Get the export job and project script metadata
 * 2. Authenticate with stored tokens
 * 3. Upload the video file via YouTube Data API
 * 4. Create a Video record in DB with the YouTube video ID
 */
export async function uploadToYouTube(
  exportJobId: string,
  accessToken: string,
  refreshToken: string,
): Promise<ServiceResult<Video>> {
  try {
    // 1. Get export job and project data
    const exportJob = await prisma.exportJob.findUnique({
      where: { id: exportJobId },
      include: {
        project: {
          include: {
            script: true,
          },
        },
      },
    });

    if (!exportJob || !exportJob.localPath) {
      throw new Error("Export job not found or no video file available.");
    }

    if (!fs.existsSync(exportJob.localPath)) {
      throw new Error("Video file not found on disk. Re-export the project first.");
    }

    const script = exportJob.project.script;
    if (!script) {
      throw new Error("No script found for the project.");
    }

    // 2. Set up authenticated YouTube client
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // 3. Build video metadata from the script
    const title = script.metaTitle || exportJob.project.title;
    const description = [
      script.metaDescription,
      "",
      script.hashtags.map(h => `#${h}`).join(" "),
      "#shorts #youtubeshorts", // Explicitly added to guarantee Shorts algorithm pickup
    ].join("\n");

    // 4. Upload the video
    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title.substring(0, 100), // YouTube title limit
          description: description.substring(0, 5000),
          categoryId: "27", // Education category
          defaultLanguage: "en",
        },
        status: {
          privacyStatus: "public", // Publish directly to the public
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(exportJob.localPath),
      },
    });

    const youtubeId = response.data.id;
    if (!youtubeId) {
      throw new Error("YouTube upload succeeded but no video ID was returned.");
    }

    // 5. Create Video record in the database
    const video = await prisma.video.create({
      data: {
        projectId: exportJob.projectId,
        fileUrl: exportJob.outputUrl,
        localPath: exportJob.localPath,
        youtubeId,
        publishStatus: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    return { success: true, data: video };
  } catch (error) {
    console.error("YouTube upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "YouTube upload failed",
    };
  }
}

/**
 * Fetch the connected YouTube channel details.
 */
export async function getConnectedYouTubeChannel(accessToken: string, refreshToken?: string) {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const response = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    const channel = response.data.items?.[0];
    if (!channel) return null;

    return {
      id: channel.id,
      title: channel.snippet?.title,
      thumbnail: channel.snippet?.thumbnails?.default?.url,
      subscriberCount: channel.statistics?.subscriberCount,
    };
  } catch (error) {
    console.error("Failed to fetch YouTube channel info:", error);
    return null;
  }
}
