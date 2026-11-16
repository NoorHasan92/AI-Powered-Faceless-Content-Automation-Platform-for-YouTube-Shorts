// File Location: src/services/research.service.ts
// Deep Research Engine for long-form video scripting.
// Researches YouTube trends, competitor angles, factual timelines, and chapter structures.

import { generateStructuredContent } from "./ai/gemini";

export interface YouTubeTrendItem {
  query: string;
  relevance: string;
}

export interface CompetitorAngle {
  viralTitle: string;
  hookStrategy: string;
  audienceCuriosityGap: string;
  unaddressedOpportunity: string;
}

export interface FactualDiscovery {
  category: "TIMELINE" | "STATISTIC" | "MECHANISM" | "QUOTE" | "MYTH_BUST";
  headline: string;
  details: string;
  significance: string;
}

export interface NarrativeChapter {
  chapterIndex: number;
  title: string;
  actType: "COLD_OPEN" | "INVESTIGATION" | "ESCALATION" | "TURNING_POINT" | "CLIMAX" | "AFTERMATH";
  narrativeGoal: string;
  keyFactsToCover: string[];
  visualThemes: string[];
  estimatedMinutes: number;
}

export interface ResearchDossier {
  topic: string;
  niche: string;
  corePremise: string;
  youtubeTrends: string[];
  competitorAnalysis: CompetitorAngle[];
  factualDossier: FactualDiscovery[];
  chronologicalTimeline: { period: string; event: string }[];
  chapters: NarrativeChapter[];
  viralHooks: string[];
  controversyOrCuriosityPoints: string[];
  recommendedPacingNotes: string;
}

/**
 * Queries Google's free YouTube Search Suggestion API to find live search demand.
 */
export async function getLiveYouTubeQueries(seed: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(seed)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];

    const text = await res.text();
    // Format is: window.google.ac.h(["seed",[["query 1",0,[...]],["query 2",0,[...]]],...])
    const matches = text.match(/\["([^"]+)",0/g);
    if (!matches) return [];

    return matches
      .map(m => m.replace(/^\["/, "").replace(/",0$/, ""))
      .filter(q => q.toLowerCase() !== seed.toLowerCase())
      .slice(0, 8);
  } catch (err) {
    console.warn("[ResearchService] YouTube query suggestion lookup failed:", err);
    return [];
  }
}

/**
 * Optional: Queries the official YouTube Data API v3 if YOUTUBE_API_KEY is configured in .env.
 */
export async function fetchLiveYouTubeCompetitors(query: string): Promise<{ title: string; channel: string; description: string }[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=viewCount&maxResults=5&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json() as any;
    if (!data.items) return [];

    return data.items.map((item: any) => ({
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      description: item.snippet.description,
    }));
  } catch (err) {
    console.warn("[ResearchService] YouTube Data API lookup failed:", err);
    return [];
  }
}

/**
 * Executes a deep research investigation for a long-form or documentary video topic.
 */
export async function executeDeepResearch(options: {
  topic: string;
  niche: string;
  tone: string;
  targetDuration: string;
  subtopics?: string[];
  creatorInstructions?: string | null;
}): Promise<ResearchDossier> {
  const { topic, niche, tone, targetDuration, subtopics = [], creatorInstructions } = options;

  console.log(`[ResearchService] Starting deep research on topic: "${topic}" (${niche})...`);

  // 1. Fetch live YouTube trend signals
  const [trendSuggestions, liveCompetitors] = await Promise.all([
    getLiveYouTubeQueries(topic),
    fetchLiveYouTubeCompetitors(topic),
  ]);

  const trendsContext = trendSuggestions.length > 0
    ? `Live YouTube search demand queries for this topic:\n${trendSuggestions.map(t => `- ${t}`).join("\n")}`
    : "No live YouTube query suggestions retrieved.";

  const competitorsContext = liveCompetitors.length > 0
    ? `Top-viewed existing YouTube videos on this topic:\n${liveCompetitors.map(c => `- "${c.title}" by ${c.channel}: ${c.description.slice(0, 100)}...`).join("\n")}`
    : "No live competitor video records supplied.";

  const userSubtopicsContext = subtopics.length > 0
    ? `The creator requested these specific subtopics/angles to be thoroughly researched and included:\n${subtopics.map(s => `- ${s}`).join("\n")}`
    : "No predefined subtopics. Discover the most compelling factual angles automatically.";

  const instructionsContext = creatorInstructions
    ? `Director Notes from the Creator:\n"${creatorInstructions}"`
    : "";

  // 2. Formulate the comprehensive Deep Research prompt
  const researchPrompt = `
You are the Lead Investigative Researcher and YouTube Content Strategist for a high-production documentary channel (comparable to Vox, Johnny Harris, Kurzgesagt, and Magnates Media).
Your mission is to perform a rigorous, factual, and competitive deep dive on the requested topic before any scriptwriting begins.

--- TOPIC & PROJECT PARAMETERS ---
Niche: ${niche}
Core Topic: ${topic}
Tone: ${tone}
Target Video Duration: ${targetDuration}
${instructionsContext}

--- LIVE YOUTUBE RESEARCH SIGNALS ---
${trendsContext}
${competitorsContext}

--- USER REQUESTED SUBTOPICS ---
${userSubtopicsContext}

--- RESEARCH OBJECTIVES ---
1. COMPETITIVE GAP ANALYSIS: Analyze how other YouTube creators cover this. Identify what made top videos blow up, and pinpoint the "unaddressed curiosity gap" that our video can own.
2. HARD FACTUAL DOSSIER: Extract verified historical dates, scientific mechanics, shocking statistics, primary quotes, and counter-intuitive facts (myth-busting). NO vague generalities. Every point must be tangible and specific.
3. CHRONOLOGICAL TIMELINE: Construct the step-by-step chronology of events or discoveries.
4. MULTI-ACT CHAPTER ARCHITECTURE: Formulate a compelling 3-to-6 chapter narrative progression:
   - Act 1: The Inciting Mystery / Cold Open
   - Act 2: The Context & Investigation (unpacking the underlying systems)
   - Act 3: The Escalation / Point of No Return
   - Act 4: The Climax / The Unraveling
   - Act 5: The Aftermath & Modern Repercussions
5. VIRAL HOOKS: Craft 3 psychological curiosity-gap opening hook options designed to maximize 30-second retention.

--- OUTPUT SPECIFICATION ---
You must return ONLY a raw JSON object matching this exact schema:
{
  "topic": "${topic}",
  "niche": "${niche}",
  "corePremise": "A 2-sentence summary of the unique thesis of this video.",
  "youtubeTrends": ["trend 1", "trend 2", "trend 3"],
  "competitorAnalysis": [
    {
      "viralTitle": "Title of typical competitor video",
      "hookStrategy": "How they hooked viewers",
      "audienceCuriosityGap": "The core question the audience wanted answered",
      "unaddressedOpportunity": "What our video will do deeper, better, or from a fresh angle"
    }
  ],
  "factualDossier": [
    {
      "category": "TIMELINE", // "TIMELINE" | "STATISTIC" | "MECHANISM" | "QUOTE" | "MYTH_BUST"
      "headline": "Specific concise fact headline",
      "details": "Dense factual context with real names, numbers, or dates",
      "significance": "Why this matters to the viewer emotionally or intellectually"
    }
  ],
  "chronologicalTimeline": [
    { "period": "e.g., April 5, 1815", "event": "First massive detonations begin at Mount Tambora" }
  ],
  "chapters": [
    {
      "chapterIndex": 1,
      "title": "Chapter Title",
      "actType": "COLD_OPEN", // "COLD_OPEN" | "INVESTIGATION" | "ESCALATION" | "TURNING_POINT" | "CLIMAX" | "AFTERMATH"
      "narrativeGoal": "What the viewer discovers in this chapter",
      "keyFactsToCover": ["fact 1", "fact 2"],
      "visualThemes": ["cinematic visual motif 1", "cinematic visual motif 2"],
      "estimatedMinutes": 1.5
    }
  ],
  "viralHooks": [
    "Hook option 1 (opening line and question)",
    "Hook option 2",
    "Hook option 3"
  ],
  "controversyOrCuriosityPoints": [
    "Point of tension or surprising reality 1",
    "Point of tension 2"
  ],
  "recommendedPacingNotes": "Director directives on pacing, pauses, and emotional beats for this specific topic."
}

Rules:
- Provide at least 5-8 dense factual discoveries across diverse categories (statistics, quotes, mechanisms, timeline).
- Formulate 3-6 distinct narrative chapters tailored to the ${targetDuration} runtime.
- Guarantee that all facts are historical/scientific reality, not creative fiction.
`.trim();

  const rawData = await generateStructuredContent(researchPrompt);
  return rawData as ResearchDossier;
}

