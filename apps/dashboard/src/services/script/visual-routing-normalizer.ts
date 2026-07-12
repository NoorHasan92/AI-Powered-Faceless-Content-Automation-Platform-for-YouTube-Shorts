// File Location: src/services/script/visual-routing-normalizer.ts
// Post-processes Gemini's scene plan to enforce cinematic visual routing.
//
// Philosophy:
// - INFOGRAPHIC is NOT a visual style. It is ONLY a structured data visualization tool.
// - Use INFOGRAPHIC ONLY when the viewer must read structured information (rankings,
//   timelines, percentages, comparisons, statistics, tables, charts, flow diagrams, maps).
// - Everything else should use AI_IMAGE or STOCK_VIDEO.
// - Science documentaries should primarily communicate through cinematic visuals, not diagrams.
// - Abstract, conceptual, and invisible phenomena should always become AI_IMAGE.
// - AI_IMAGE is treated as an abundant resource, not a scarce one.

import type { ScriptResponse, SceneInput } from "@/validations/script.schema";

// ---------------------------------------------------------------------------
// Keyword banks
// ---------------------------------------------------------------------------

/**
 * Concepts that should almost always become AI_IMAGE because literal footage
 * cannot realistically exist for them.
 */
const ABSTRACT_KEYWORDS = [
  // Neuroscience & brain
  "deja vu", "déjà vu", "hippocampus", "temporal lobe", "rhinal cortex", "cortex",
  "synapse", "synaptic", "neuron", "neural", "memory encoding", "false familiarity",
  "perception glitch", "signal delay", "timing error", "pattern recognition",
  "dopamine", "cognition", "brain architecture", "abstract neural",
  "fractal", "glowing network", "internal biological", "misfire", "latency error",
  "neurotransmitter", "serotonin", "adrenaline", "cortisol", "norepinephrine",
  "amygdala", "prefrontal cortex", "cerebellum", "brain stem", "thalamus",
  "axon", "dendrite", "myelin", "nerve impulse", "action potential",

  // Consciousness & mind
  "consciousness", "subconscious", "unconscious", "awareness", "self-awareness",
  "perception", "cognition", "mental model", "thought process", "inner voice",
  "instinct", "intuition", "premonition", "gut feeling",

  // Memory & dreams
  "memory", "recall", "nostalgia", "remembering", "forgetting",
  "dreams", "dreaming", "REM sleep", "lucid dream", "nightmare",
  "hallucination", "illusion", "delusion",

  // Emotions & psychology
  "emotions", "emotional response", "fear response", "fight or flight",
  "anxiety", "stress response", "panic", "empathy", "grief",
  "attachment", "bonding", "love chemical", "oxytocin",

  // Thoughts & imagination
  "thoughts", "thinking", "imagination", "creative thinking",
  "abstract reasoning", "problem solving", "insight",
  "surreal", "existential", "philosophical concept",

  // Internal organs & biology
  "internal organs", "inside the body", "internal camera",
  "blood flow", "heartbeat internal", "lung alveoli", "alveolar",
  "digestive system", "peristalsis", "immune response",
  "white blood cell", "antibody", "platelet", "red blood cell",
  "retina", "optic nerve", "cochlea", "inner ear",

  // Microscopic biology
  "microscopic", "cellular", "cells", "cell division", "mitosis", "meiosis",
  "DNA", "RNA", "chromosome", "gene expression", "genome",
  "protein folding", "enzyme", "ribosome", "mitochondria",
  "organelle", "cell membrane", "cytoplasm", "nucleus",
  "virus", "bacteria", "microbe", "pathogen",
  "photosynthesis", "chloroplast", "osmosis",

  // Atomic & quantum scale
  "atoms", "atomic", "molecules", "molecular",
  "quantum", "quantum mechanics", "quantum scale", "superposition",
  "entanglement", "wave function", "probability cloud",
  "electron", "proton", "neutron", "quark", "boson", "photon",
  "subatomic", "particle physics", "nuclear",

  // Cosmic scale
  "galaxies", "galaxy", "nebula", "nebulae",
  "black holes", "black hole", "event horizon", "singularity",
  "supernova", "neutron star", "pulsar", "quasar",
  "dark matter", "dark energy", "cosmic microwave",
  "planetary formation", "protoplanetary", "accretion disk",
  "cosmic scale", "interstellar", "intergalactic",

  // Abstract & metaphorical
  "abstract metaphor", "conceptual visualization",
  "impossible camera", "impossible perspective",
  "invisible process", "invisible force",
  "time perception", "flow of time", "temporal",
  "energy flow", "energy transfer",
  "neural signal", "electrical signal",
  "electromagnetic", "magnetic field", "gravity wave",
  "aurora", "atmospheric phenomenon",

  // Geological & earth science
  "tectonic", "magma", "mantle", "earth core",
  "ocean current", "deep sea", "hydrothermal",
  "evolution visualization", "natural selection visual",

  // General AI-worthy signals
  "surreal", "ethereal", "bioluminescent", "translucent",
  "impossible", "invisible", "internal", "microscale", "nanoscale"
];

/**
 * Hero keywords — scenes with these get extra AI worthiness boost.
 */
const HERO_KEYWORDS = [
  "deja vu", "déjà vu", "consciousness", "surreal", "fractal",
  "glowing network", "existential", "black hole", "singularity",
  "quantum", "dream", "nightmare", "cosmic", "evolution",
  "big bang", "origin of life", "deep time"
];

/**
 * Keywords that indicate the scene depicts a real-world, filmable scenario.
 * These scenes should prefer STOCK_VIDEO.
 */
const LITERAL_KEYWORDS = [
  "student studying", "person walking into", "holding a phone",
  "classroom", "desk", "hallway", "lab footage", "literal real human",
  "camera footage", "stock footage", "real world", "interview",
  "office", "street", "city", "crowd", "traffic", "building",
  "restaurant", "hospital exterior", "park", "beach"
];

/**
 * STRICT infographic markers — ONLY these patterns justify INFOGRAPHIC.
 * Pure structured data that requires the viewer to READ information.
 */
const STRICT_INFOGRAPHIC_MARKERS = [
  { test: (b: string) => /\d+%/.test(b), reason: "percentages / statistics" },
  { test: (b: string) => /\$[\d,]+/.test(b) || /\d+\s*(billion|million|trillion|thousand)/i.test(b), reason: "financial / numerical data" },
  { test: (b: string) => b.includes("ranking") || b.includes("ranked") || b.includes("top 10") || b.includes("top 5"), reason: "rankings" },
  { test: (b: string) => b.includes("flowchart") || b.includes("schematic") || b.includes("flow diagram"), reason: "flowchart / schematic" },
  { test: (b: string) => b.includes("chart") || b.includes("graph") || b.includes("bar graph") || b.includes("pie chart"), reason: "chart / graph" },
  { test: (b: string) => b.includes("table") && (b.includes("data") || b.includes("statistics") || b.includes("comparison")), reason: "data table" },
  { test: (b: string) => b.includes("map") && (b.includes("region") || b.includes("country") || b.includes("geographic")), reason: "geographic map" },
  { test: (b: string) => b.includes("timeline") && /\d{4}/.test(b), reason: "dated timeline" },
  { test: (b: string) => b.includes(" vs ") && /\d/.test(b), reason: "numerical comparison" },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildSceneBlob(scene: SceneInput): string {
  return [
    scene.narrationText,
    scene.visualPrompt,
    scene.onScreenCaption,
    ...(scene.searchKeywords || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreSceneAiWorthiness(scene: SceneInput, blob: string, isAbstract: boolean, isLiteral: boolean): number {
  // Literal real-world scenes strongly prefer stock footage
  if (isLiteral) return 1;

  let score = 5; // Base score — AI-friendly default

  // Abstract content is highly AI-worthy
  if (isAbstract) score += 4;

  // Emotional payoff scenes deserve premium AI treatment
  if (scene.endingIntent === "EMOTIONAL_PAYOFF") score += 5;

  // Hero keywords get extra boost
  if (HERO_KEYWORDS.some(k => blob.includes(k))) score += 3;

  // Visual prompts mentioning impossible/internal/abstract imagery
  const visualPromptLower = (scene.visualPrompt || "").toLowerCase();
  if (visualPromptLower.includes("impossible") || visualPromptLower.includes("internal") ||
      visualPromptLower.includes("surreal") || visualPromptLower.includes("abstract") ||
      visualPromptLower.includes("glowing") || visualPromptLower.includes("microscopic")) {
    score += 2;
  }

  return score;
}

function isStrongInfographicCandidate(scene: SceneInput, blob: string): { isStrong: boolean; reason?: string } {
  // If the content is abstract, REJECT infographic candidacy entirely.
  // Abstract concepts should never become diagrams.
  const isAbstract = ABSTRACT_KEYWORDS.some(k => blob.includes(k.toLowerCase()));
  if (isAbstract) {
    return { isStrong: false };
  }

  // Check strict infographic markers — only genuine structured data
  for (const marker of STRICT_INFOGRAPHIC_MARKERS) {
    if (marker.test(blob)) {
      return { isStrong: true, reason: marker.reason };
    }
  }

  return { isStrong: false };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface VisualBudget {
  maxAiImageScenes: number;
  preferredMotionRatio: number;
  projectNiche?: string | null;
}

export function normalizeSceneVisualRouting(
  script: ScriptResponse,
  budget: VisualBudget = { maxAiImageScenes: 6, preferredMotionRatio: 0.7 }
): ScriptResponse {

  const isScienceNiche = budget.projectNiche && (
       budget.projectNiche.toLowerCase().includes("science") ||
       budget.projectNiche.toLowerCase().includes("psychology") ||
       budget.projectNiche.toLowerCase().includes("neuro") ||
       budget.projectNiche.toLowerCase().includes("biology") ||
       budget.projectNiche.toLowerCase().includes("physics") ||
       budget.projectNiche.toLowerCase().includes("chemistry") ||
       budget.projectNiche.toLowerCase().includes("medical") ||
       budget.projectNiche.toLowerCase().includes("health") ||
       budget.projectNiche.toLowerCase().includes("space") ||
       budget.projectNiche.toLowerCase().includes("astronomy")
  );

  // Step A & B: Score scenes and determine initial visual source
  const scoredScenes = script.scenes.map((scene, index) => {
    const blob = buildSceneBlob(scene);
    const isLiteral = LITERAL_KEYWORDS.some(k => blob.includes(k.toLowerCase()));
    const isAbstract = ABSTRACT_KEYWORDS.some(k => blob.includes(k.toLowerCase()));

    const infographicCheck = isStrongInfographicCandidate(scene, blob);

    // Determine initial source
    let initialSource = scene.visualSource;

    // Rule 1: Strong infographic candidate with genuine structured data → INFOGRAPHIC
    if (infographicCheck.isStrong && !isAbstract) {
      initialSource = "INFOGRAPHIC";
    }
    // Rule 2: Abstract content should ALWAYS be AI_IMAGE (override even planner's INFOGRAPHIC)
    else if (isAbstract && !isLiteral) {
      initialSource = "AI_IMAGE";
    }
    // Rule 3: If planner said INFOGRAPHIC but it's not a strong candidate → redirect to AI_IMAGE
    else if (initialSource === "INFOGRAPHIC" && !infographicCheck.isStrong) {
      console.log(`[VisualNormalizer] Scene ${index + 1}: INFOGRAPHIC → AI_IMAGE (not structured data)`);
      initialSource = "AI_IMAGE";
    }

    // Rule 4: Emotional payoff scenes deserve AI_IMAGE
    if (scene.endingIntent === "EMOTIONAL_PAYOFF" && !infographicCheck.isStrong) {
      initialSource = "AI_IMAGE";
    }

    return {
      scene,
      index,
      blob,
      isLiteral,
      isAbstract,
      infographicCheck,
      score: scoreSceneAiWorthiness(scene, blob, isAbstract, isLiteral),
      initialSource
    };
  });

  // Calculate generous AI image budget — AI is an abundant resource
  const totalDuration = script.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
  const dynamicMaxAiScenes = Math.max(6, Math.floor(totalDuration / 8));

  // Step C: Enforce AI budget (generous)
  const aiCandidateScenes = scoredScenes.filter(s => s.initialSource === "AI_IMAGE");
  aiCandidateScenes.sort((a, b) => b.score - a.score);

  const allowedAiScenes = new Set(
    aiCandidateScenes.slice(0, dynamicMaxAiScenes).map(s => s.index)
  );

  const normalizedScenes = scoredScenes.map((scored) => {
    const { scene, index, blob, initialSource, infographicCheck } = scored;

    const out: SceneInput & { visualSourcePlanned?: any, motionTreatment?: any, routingDowngradeReason?: any } = {
      ...scene,
      visualSourcePlanned: scene.visualSource || "STOCK_VIDEO"
    };

    let finalSource = initialSource;
    let downgradeReason: string | undefined = undefined;

    // D. Downgrade rejected AI scenes
    if (initialSource === "AI_IMAGE" && !allowedAiScenes.has(index)) {
      downgradeReason = "AI_QUOTA";

      // Fallback to STOCK_VIDEO, do not fallback to INFOGRAPHIC unless it's strongly structured data.
      if (infographicCheck.isStrong) {
          finalSource = "INFOGRAPHIC";
      } else {
          finalSource = "STOCK_VIDEO";
      }

      if (finalSource === "STOCK_VIDEO") {
        // Generate contextual asset searches based on scene content
        out.assetSearches = generateContextualSearches(blob, scene);
      }

      console.log(`[VisualNormalizer] Scene ${index + 1}: AI_IMAGE → ${finalSource} (${downgradeReason})`);
    }

    if (finalSource === "INFOGRAPHIC" && infographicCheck.isStrong) {
      console.log(`[VisualNormalizer] Scene ${index + 1}: INFOGRAPHIC kept: ${infographicCheck.reason}`);
    }

    out.visualSource = finalSource as any;

    return { out, index, score: scored.score, downgradeReason };
  });

  // Step E: Enforce INFOGRAPHIC quota (max 1 for science, max 2 for other niches)
  const maxInfographics = isScienceNiche ? 1 : 2;
  let infographicScenes = normalizedScenes.filter(s => s.out.visualSource === "INFOGRAPHIC");
  if (infographicScenes.length > maxInfographics) {
    const allowedInfographics = new Set(infographicScenes.slice(0, maxInfographics).map(s => s.index));

    for (const sc of infographicScenes) {
        if (!allowedInfographics.has(sc.index)) {
            console.log(`[VisualNormalizer] Scene ${sc.index + 1}: INFOGRAPHIC → AI_IMAGE (Quota exceeded — max ${maxInfographics})`);
            sc.out.visualSource = "AI_IMAGE";
            if (!sc.downgradeReason) {
                sc.out.routingDowngradeReason = "MOTION_SUBSTITUTION";
            }
        }
    }
  }

  const finalScenes = normalizedScenes.map(({ out }) => {
    // Fix up infographic payload if needed
    if (out.visualSource === "INFOGRAPHIC" && !out.infographicPayload) {
      out.infographicPayload = {
        title: out.onScreenCaption || "Process Explanation",
        data: "Conceptual pathway"
      };
    }

    // Ensure AI prompt exists and is cinematic quality
    if (out.visualSource === "AI_IMAGE") {
      out.generatedAssetPrompt = enrichAiPrompt(out);
    }

    // Assign Motion Treatments
    if (out.visualSource === "STOCK_VIDEO") {
      out.motionTreatment = "LOOP_VIDEO";
    } else if (out.visualSource === "INFOGRAPHIC") {
      out.motionTreatment = "INFOGRAPHIC_MOTION";
    } else if (out.visualSource === "STOCK_IMAGE" || out.visualSource === "AI_IMAGE") {
      out.motionTreatment = "KEN_BURNS";
    }

    return out;
  });

  return {
    ...script,
    scenes: finalScenes,
  };
}

// ---------------------------------------------------------------------------
// Cinematic prompt enrichment
// ---------------------------------------------------------------------------

/** Cinematic quality modifiers applied when prompts lack cinematic language. */
const CINEMATIC_ENRICHMENT_SUFFIXES = [
  "ultra-cinematic documentary quality",
  "dramatic volumetric lighting",
  "photorealistic textures",
  "8k resolution",
  "vertical composition"
];

const CINEMATIC_CHECK_TOKENS = [
  "cinematic", "macro", "wide", "shot", "lighting", "volumetric",
  "dramatic", "close-up", "perspective", "composition", "8k",
  "photorealistic", "depth of field", "concept art", "documentary"
];

function enrichAiPrompt(scene: SceneInput & { visualSourcePlanned?: any }): string {
  const existing = scene.generatedAssetPrompt;

  // No prompt at all — generate a complete one from scene metadata
  if (!existing || existing.trim().length < 10) {
    const subject = scene.searchKeywords?.[0] || scene.onScreenCaption || "abstract concept";
    return `Ultra-cinematic macro visualization of ${subject}, impossible internal perspective, ` +
           `bioluminescent organic glow, subsurface scattering, dramatic volumetric lighting, ` +
           `atmospheric fog, shallow depth of field, premium documentary concept art, ` +
           `hyper-realistic textures, 8k resolution, vertical composition.`;
  }

  // Check if prompt already has sufficient cinematic quality
  const lower = existing.toLowerCase();
  const cinematicHits = CINEMATIC_CHECK_TOKENS.filter(t => lower.includes(t)).length;

  if (cinematicHits >= 3) {
    // Already has good cinematic language — leave it
    return existing;
  }

  // Prompt exists but lacks cinematic quality — enrich it
  const missingModifiers = CINEMATIC_ENRICHMENT_SUFFIXES.filter(
    mod => !lower.includes(mod.split(" ")[0].toLowerCase())
  );

  if (missingModifiers.length > 0) {
    return `${existing.replace(/\.$/, "")}, ${missingModifiers.join(", ")}.`;
  }

  return existing;
}

// ---------------------------------------------------------------------------
// Contextual asset search generation for stock fallbacks
// ---------------------------------------------------------------------------

function generateContextualSearches(
  blob: string,
  scene: SceneInput
): Array<{ query: string; type: "video" | "image"; purpose: string }> {
  // Neuroscience / brain content
  if (blob.includes("deja vu") || blob.includes("memory") || blob.includes("familiarity") || blob.includes("glitch")) {
    return [
      { query: "brain signal glitch animation", type: "video", purpose: "primary" },
      { query: "abstract memory distortion particles", type: "video", purpose: "secondary" },
      { query: "glowing neural network loop", type: "video", purpose: "fallback" }
    ];
  }

  if (blob.includes("latency") || blob.includes("delay") || blob.includes("sync error") || blob.includes("timing")) {
    return [
      { query: "signal pulse delay animation", type: "video", purpose: "primary" },
      { query: "glitch data stream loop", type: "video", purpose: "secondary" },
      { query: "abstract synchronization error", type: "video", purpose: "fallback" }
    ];
  }

  if (blob.includes("hippocampus") || blob.includes("temporal lobe") || blob.includes("encoding") || blob.includes("pathway") || blob.includes("misfire")) {
    return [
      { query: "abstract brain pathway animation", type: "video", purpose: "primary" },
      { query: "glowing neural pathway loop", type: "video", purpose: "secondary" },
      { query: "memory encoding particles", type: "video", purpose: "fallback" }
    ];
  }

  // Cosmic / space content
  if (blob.includes("galaxy") || blob.includes("cosmic") || blob.includes("universe") || blob.includes("nebula")) {
    return [
      { query: "galaxy nebula cinematic loop", type: "video", purpose: "primary" },
      { query: "cosmic space particles animation", type: "video", purpose: "secondary" },
      { query: "deep space stars background", type: "video", purpose: "fallback" }
    ];
  }

  // Cellular / biological content
  if (blob.includes("cell") || blob.includes("dna") || blob.includes("microscopic") || blob.includes("virus")) {
    return [
      { query: "microscopic cell animation", type: "video", purpose: "primary" },
      { query: "DNA helix rotation loop", type: "video", purpose: "secondary" },
      { query: "abstract biology particles", type: "video", purpose: "fallback" }
    ];
  }

  // Emotional payoff fallback
  if (scene.endingIntent === "EMOTIONAL_PAYOFF") {
    return [
      { query: "cosmic eye abstract loop", type: "video", purpose: "primary_motion_fallback" },
      { query: "abstract particles background", type: "video", purpose: "secondary_motion_fallback" }
    ];
  }

  // Generic abstract fallback
  return [
    { query: "abstract glowing loop", type: "video", purpose: "primary_motion_fallback" },
    { query: "science abstract background", type: "video", purpose: "secondary_motion_fallback" }
  ];
}
