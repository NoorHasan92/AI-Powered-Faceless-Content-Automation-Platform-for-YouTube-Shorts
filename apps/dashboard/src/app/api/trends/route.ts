// File Location: src/app/api/trends/route.ts
// API route exposing trending topic suggestions for the project creator.

import { NextResponse } from "next/server";
import { getTrendingTopics } from "@/services/trends.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche") || "science";

    const topics = await getTrendingTopics(niche);

    return NextResponse.json({
      success: true,
      data: topics,
    });
  } catch (error) {
    console.error("[API/trends] Failed to fetch trending topics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trending topics" },
      { status: 500 }
    );
  }
}
