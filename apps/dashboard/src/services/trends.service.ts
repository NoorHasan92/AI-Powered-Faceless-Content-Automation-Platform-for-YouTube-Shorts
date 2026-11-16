// File Location: src/services/trends.service.ts
// Service for fetching live trending topics and synthesizing viral video ideas.
// Combines free YouTube autocomplete + Google Trends RSS with Gemini AI.

import { generateStructuredContent } from "@/services/ai/gemini";

export interface TrendingTopicItem {
  id: string;
  title: string;
  niche: string;
  tone: string;
  specificTopic: string;
  subtopics: string[];
  hookAngle: string;
  targetDuration: string;
  videoFormat: "SHORTS" | "LONG_FORM";
  viralScore: number; // 85-99
  source: string;
}

const CURATED_VIRAL_FALLBACKS: Record<string, TrendingTopicItem[]> = {
  science: [
    {
      id: "sci-1",
      title: "The Sound Recorded at the Deepest Point on Earth",
      niche: "science",
      tone: "mysterious",
      specificTopic: "Acoustic hydrophone recordings at Challenger Deep in the Mariana Trench",
      subtopics: [
        "NOAA ceramic hydrophone titanium casing",
        "Eerie low-frequency ambient rumbles and baleen whale calls",
        "Deep-sea earthquake resonance 36,000 feet below",
        "Why sounds travel thousands of miles through the SOFAR channel"
      ],
      hookAngle: "Scientists dropped a titanium microphone 7 miles underwater. What it recorded baffled oceanographers.",
      targetDuration: "3-5 Minutes",
      videoFormat: "LONG_FORM",
      viralScore: 98,
      source: "Evergreen Viral Radar"
    },
    {
      id: "sci-2",
      title: "What Happens When You Touch Pure Plutonium?",
      niche: "science",
      tone: "suspenseful",
      specificTopic: "The Demon Core incidents of 1945 and 1946 at Los Alamos",
      subtopics: [
        "Harry Daghlian and the tungsten carbide brick slip",
        "Louis Slotin and the flathead screwdriver slip",
        "The blue ionization flash and metallic taste of lethal radiation",
        "The instantaneous criticality physics behind the Demon Core"
      ],
      hookAngle: "In 1946, a scientist was holding a screwdriver over a radioactive sphere. Then his hand slipped.",
      targetDuration: "3-5 Minutes",
      videoFormat: "LONG_FORM",
      viralScore: 97,
      source: "Evergreen Viral Radar"
    },
    {
      id: "sci-3",
      title: "The 1.8-Billion-Year-Old Natural Nuclear Reactor",
      niche: "science",
      tone: "educational",
      specificTopic: "The Oklo natural nuclear fission reactors discovered in Gabon, Africa",
      subtopics: [
        "1972 French uranium enrichment plant isotopic anomaly",
        "Self-sustaining nuclear chain reactions powered by groundwater moderators",
        "Ancient geological containment lasting nearly 2 billion years",
        "Lessons for modern nuclear waste storage"
      ],
      hookAngle: "Before humans split the atom, nature built its own nuclear power plant nearly 2 billion years ago.",
      targetDuration: "30-50 Seconds",
      videoFormat: "SHORTS",
      viralScore: 94,
      source: "Evergreen Viral Radar"
    }
  ],
  history: [
    {
      id: "hist-1",
      title: "The Island That Disappeared From Every Map in 1997",
      niche: "history",
      tone: "investigative",
      specificTopic: "The phantom island of Bermeja off the coast of Yucatan and oil territory disputes",
      subtopics: [
        "Historical Spanish charts placing Bermeja in the Gulf of Mexico",
        "The 10-year maritime treaty drawing exclusive 200-nautical-mile economic zones",
        "Mexican oceanic expeditions finding only open water",
        "Conspiracy theories of CIA demolition vs cartographic errors"
      ],
      hookAngle: "In 1997, a sovereign country sent a naval vessel to claim billions in oil territory. The island was completely gone.",
      targetDuration: "3-5 Minutes",
      videoFormat: "LONG_FORM",
      viralScore: 96,
      source: "Evergreen Viral Radar"
    },
    {
      id: "hist-2",
      title: "The Dancing Plague That Killed Hundreds in 1518",
      niche: "history",
      tone: "dramatic",
      specificTopic: "The 1518 Strasbourg dancing mania and mass psychogenic illness",
      subtopics: [
        "Frau Troffea initiating non-stop dancing in Strasbourg streets",
        "Physicians prescribing more dancing and hiring brass musicians",
        "Ergot fungus poisoning vs mass stress-induced psychogenic hysteria",
        "The horrific physical toll of continuous cardiac exertion"
      ],
      hookAngle: "In the summer of 1518, a woman stepped into a street and started dancing. Within weeks, 400 people joined until their hearts gave out.",
      targetDuration: "30-50 Seconds",
      videoFormat: "SHORTS",
      viralScore: 95,
      source: "Evergreen Viral Radar"
    }
  ],
  mystery: [
    {
      id: "myst-1",
      title: "The Wow! Signal: The 72 Seconds That Froze Astronomy",
      niche: "mystery",
      tone: "mysterious",
      specificTopic: "The 1977 Ohio State Big Ear radio telescope narrowband signal detection",
      subtopics: [
        "Jerry Ehman circling the 6EQUJ5 printout code",
        "Hydrogen resonance frequency at 1420.405 MHz",
        "Decades of repeated telescope scans returning absolute silence",
        "Comet hydrogen cloud hypotheses vs genuine extraterrestrial transmission"
      ],
      hookAngle: "On August 15, 1977, a radio telescope picked up an intentional transmission from deep space. It was never heard again.",
      targetDuration: "3-5 Minutes",
      videoFormat: "LONG_FORM",
      viralScore: 99,
      source: "Evergreen Viral Radar"
    }
  ]
};

/**
 * Fetch raw trending search queries from free YouTube Autocomplete.
 */
async function fetchYouTubeAutocomplete(seedQuery: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(seedQuery)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].slice(0, 10);
    }
    return [];
  } catch (err) {
    console.warn("[TrendsService] YouTube autocomplete lookup failed:", err);
    return [];
  }
}

/**
 * Fetch top search terms from Google Trends RSS.
 */
async function fetchGoogleTrendsRSS(): Promise<string[]> {
  try {
    const res = await fetch("https://trends.google.com/trending/rss?geo=US", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    const titleMatches = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map(m => m[1]);
    if (!titleMatches.length) {
      const plainMatches = [...text.matchAll(/<title>(.*?)<\/title>/g)].map(m => m[1]);
      return plainMatches.slice(1, 15); // omit channel title
    }
    return titleMatches.slice(1, 15);
  } catch (err) {
    console.warn("[TrendsService] Google Trends RSS fetch failed:", err);
    return [];
  }
}

/**
 * Retrieve hot trending topics tailored to a niche, synthesized with viral curiosity angles.
 */
export async function getTrendingTopics(niche: string = "science"): Promise<TrendingTopicItem[]> {
  const normalizedNiche = niche.toLowerCase().trim() || "science";

  // 1. Fetch live search signals
  const [ytQueries1, ytQueries2, googleTrends] = await Promise.all([
    fetchYouTubeAutocomplete(`${normalizedNiche} mystery`),
    fetchYouTubeAutocomplete(`${normalizedNiche} explained`),
    fetchGoogleTrendsRSS(),
  ]);

  const liveSignals = [
    ...new Set([...ytQueries1, ...ytQueries2, ...googleTrends.slice(0, 5)]),
  ].filter(Boolean);

  // 2. Synthesize with Gemini into high-engagement viral concepts
  const prompt = `You are a viral YouTube content strategist and lead researcher for top documentary channels (like Kurzgesagt, Veritasium, Lemmino, MagnatesMedia).

Analyze these current search signals and trends:
Live Search Signals: ${JSON.stringify(liveSignals.slice(0, 15))}
Target Niche: "${normalizedNiche}"

Generate 4 to 5 unique, viral video topic proposals optimized for high CTR and retention.
For each proposal, provide:
1. "title": A high-curiosity, click-worthy YouTube title (no clickbait lies, but intense curiosity).
2. "niche": "${normalizedNiche}"
3. "tone": One of ["mysterious", "suspenseful", "educational", "dramatic", "humorous"]
4. "specificTopic": A clear 1-2 sentence core premise explaining the exact historical event, scientific anomaly, or phenomenon.
5. "subtopics": An array of 3 to 4 specific factual anchors/names/mechanics for deep research.
6. "hookAngle": The opening 3-second psychological curiosity hook.
7. "targetDuration": Either "30-50 Seconds" or "3-5 Minutes" or "5-8 Minutes"
8. "videoFormat": "SHORTS" if duration is under 60 seconds, else "LONG_FORM"
9. "viralScore": An integer between 90 and 99 reflecting viral curiosity potential.

Output MUST be valid JSON adhering to this exact schema:
{
  "topics": [
    {
      "title": "string",
      "niche": "string",
      "tone": "string",
      "specificTopic": "string",
      "subtopics": ["string", "string", "string"],
      "hookAngle": "string",
      "targetDuration": "string",
      "videoFormat": "SHORTS" | "LONG_FORM",
      "viralScore": 95
    }
  ]
}`;

  try {
    const response = (await generateStructuredContent(prompt)) as {
      topics: Array<Omit<TrendingTopicItem, "id" | "source">>;
    };

    if (response?.topics && Array.isArray(response.topics) && response.topics.length > 0) {
      return response.topics.map((t, idx) => ({
        ...t,
        id: `trend-${Date.now()}-${idx}`,
        source: liveSignals.length > 0 ? "Live YouTube & Google Trends" : "AI Strategic Synthesis",
      }));
    }
  } catch (err) {
    console.warn("[TrendsService] AI trend synthesis failed, falling back to curated library:", err);
  }

  // Fallback to curated niche library
  const matchedFallbacks =
    CURATED_VIRAL_FALLBACKS[normalizedNiche] ||
    CURATED_VIRAL_FALLBACKS.science;

  return matchedFallbacks;
}
