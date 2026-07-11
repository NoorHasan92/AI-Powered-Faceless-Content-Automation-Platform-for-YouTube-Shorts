// File Location: src/services/script/visual-routing-normalizer.ts
import type { ScriptResponse, SceneInput } from "@/validations/script.schema";

const ABSTRACT_KEYWORDS = [
  "deja vu", "déjà vu", "hippocampus", "temporal lobe", "rhinal cortex", "cortex",
  "synapse", "synaptic", "neuron", "neural", "memory encoding", "false familiarity",
  "perception glitch", "signal delay", "timing error", "pattern recognition",
  "dopamine", "cognition", "brain architecture", "consciousness", "surreal",
  "abstract neural", "fractal", "glowing network", "internal biological",
  "misfire", "latency error"
];

const HERO_KEYWORDS = [
  "deja vu", "déjà vu", "consciousness", "surreal", "fractal", "glowing network", "existential"
];

const EXPLANATORY_KEYWORDS = [
  "vs", "sends signal", "first", "then", "next", "process", "mechanism",
  "comparison", "timeline", "delay between", "hippocampus vs rhinal cortex",
  "encodes", "labels", "retrieves", "step-by-step", "explanation",
  "diagram", "chart", "pathway", "flow", "compare"
];

const LITERAL_KEYWORDS = [
  "student studying", "person walking into", "holding a phone",
  "classroom", "desk", "hallway", "lab footage", "literal real human",
  "camera footage", "stock footage", "real world"
];

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

function scoreSceneAiWorthiness(scene: SceneInput, blob: string, isExplanatory: boolean, isLiteral: boolean): number {
  if (isLiteral) return 0;
  if (isExplanatory) return 2;
  
  let score = 5; // Base abstract score
  
  if (scene.endingIntent === "EMOTIONAL_PAYOFF") score += 5;
  
  if (HERO_KEYWORDS.some(k => blob.includes(k))) score += 3;
  
  return score;
}

function isStrongInfographicCandidate(scene: SceneInput, blob: string): { isStrong: boolean; reason?: string } {
    if (blob.includes(" vs ") || blob.includes("versus") || blob.includes("compare") || blob.includes("comparison")) return { isStrong: true, reason: "comparison" };
    if (blob.includes("before") && blob.includes("after")) return { isStrong: true, reason: "before vs after" };
    if (blob.includes("step 1") || blob.includes("first,") || blob.includes("second,") || blob.includes("step-by-step")) return { isStrong: true, reason: "numbered steps" };
    if (blob.includes("timeline") || blob.includes("delay between")) return { isStrong: true, reason: "timeline" };
    if (blob.includes("labeled") && (blob.includes("pathway") || blob.includes("diagram"))) return { isStrong: true, reason: "labeled mechanism diagram" };
    if (/\d+%/.test(blob)) return { isStrong: true, reason: "percentages / metrics" };
    if (blob.includes("flowchart") || blob.includes("schematic")) return { isStrong: true, reason: "flowchart / schematic" };

    return { isStrong: false };
}

export interface VisualBudget {
  maxAiImageScenes: number;
  preferredMotionRatio: number;
  projectNiche?: string | null;
}

export function normalizeSceneVisualRouting(
  script: ScriptResponse,
  budget: VisualBudget = { maxAiImageScenes: 2, preferredMotionRatio: 0.7 }
): ScriptResponse {
  
  const isScienceNiche = budget.projectNiche && (
       budget.projectNiche.toLowerCase().includes("science") || 
       budget.projectNiche.toLowerCase().includes("psychology") ||
       budget.projectNiche.toLowerCase().includes("neuro")
  );

  // Step A & B: Score scenes and preserve planned visual source
  const scoredScenes = script.scenes.map((scene, index) => {
    const blob = buildSceneBlob(scene);
    const isExplanatory = EXPLANATORY_KEYWORDS.some(k => blob.includes(k.toLowerCase()));
    const isLiteral = LITERAL_KEYWORDS.some(k => blob.includes(k.toLowerCase()));
    const isAbstract = ABSTRACT_KEYWORDS.some(k => blob.includes(k.toLowerCase()));
    
    const infographicCheck = isStrongInfographicCandidate(scene, blob);

    // Preliminary type-hinting overrides based on content before AI quota check
    let initialSource = scene.visualSource;
    
    if (isScienceNiche) {
        if (infographicCheck.isStrong && initialSource !== "INFOGRAPHIC") initialSource = "INFOGRAPHIC";
    } else {
        // Removed the generic isExplanatory override. Only force INFOGRAPHIC if it strongly matches infographic data.
        if (infographicCheck.isStrong && initialSource !== "INFOGRAPHIC") initialSource = "INFOGRAPHIC";
    }
    
    if (isAbstract && !isLiteral && initialSource !== "AI_IMAGE") initialSource = "AI_IMAGE";
    if (scene.endingIntent === "EMOTIONAL_PAYOFF" && (!infographicCheck.isStrong)) initialSource = "AI_IMAGE";

    return {
      scene,
      index,
      blob,
      isExplanatory,
      isLiteral,
      isAbstract,
      infographicCheck,
      score: scoreSceneAiWorthiness(scene, blob, isExplanatory, isLiteral),
      initialSource
    };
  });

  // Calculate dynamic AI image budget based on total duration (roughly 1 scene per 15 seconds)
  const totalDuration = script.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
  const dynamicMaxAiScenes = Math.max(2, Math.floor(totalDuration / 15));
  
  // Step C: Enforce AI budget
  const aiCandidateScenes = scoredScenes.filter(s => s.initialSource === "AI_IMAGE");
  aiCandidateScenes.sort((a, b) => b.score - a.score);
  
  const allowedAiScenes = new Set(
    aiCandidateScenes.slice(0, dynamicMaxAiScenes).map(s => s.index)
  );

  const normalizedScenes = scoredScenes.map((scored) => {
    const { scene, index, blob, isExplanatory, initialSource, infographicCheck } = scored;
    
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
        if (blob.includes("deja vu") || blob.includes("memory") || blob.includes("familiarity") || blob.includes("glitch")) {
          out.assetSearches = [
            { query: "brain signal glitch animation", type: "video", purpose: "primary" },
            { query: "abstract memory distortion particles", type: "video", purpose: "secondary" },
            { query: "glowing neural network loop", type: "video", purpose: "fallback" }
          ];
        } else if (blob.includes("latency") || blob.includes("delay") || blob.includes("sync error") || blob.includes("timing")) {
          out.assetSearches = [
            { query: "signal pulse delay animation", type: "video", purpose: "primary" },
            { query: "glitch data stream loop", type: "video", purpose: "secondary" },
            { query: "abstract synchronization error", type: "video", purpose: "fallback" }
          ];
        } else if (blob.includes("hippocampus") || blob.includes("temporal lobe") || blob.includes("encoding") || blob.includes("pathway") || blob.includes("misfire")) {
          out.assetSearches = [
            { query: "abstract brain pathway animation", type: "video", purpose: "primary" },
            { query: "glowing neural pathway loop", type: "video", purpose: "secondary" },
            { query: "memory encoding particles", type: "video", purpose: "fallback" }
          ];
        } else if (scene.endingIntent === "EMOTIONAL_PAYOFF") {
          out.assetSearches = [
            { query: "cosmic eye abstract loop", type: "video", purpose: "primary_motion_fallback" },
            { query: "abstract particles background", type: "video", purpose: "secondary_motion_fallback" }
          ];
        } else {
           out.assetSearches = [
             { query: "abstract glowing loop", type: "video", purpose: "primary_motion_fallback" },
             { query: "science abstract background", type: "video", purpose: "secondary_motion_fallback" }
           ];
        }
      }
      
      console.log(`[VisualNormalizer] Scene ${index + 1}: AI_IMAGE -> ${finalSource} (${downgradeReason})`);
    }

    if (finalSource === "INFOGRAPHIC" && infographicCheck.isStrong) {
      console.log(`[VisualNormalizer] Scene ${index + 1}: INFOGRAPHIC kept: ${infographicCheck.reason}`);
    }

    out.visualSource = finalSource as any;

    return { out, index, score: scored.score, downgradeReason };
  });

  // Step E: Enforce INFOGRAPHIC quota (max 2 by default)
  let infographicScenes = normalizedScenes.filter(s => s.out.visualSource === "INFOGRAPHIC");
  if (infographicScenes.length > 2) {
    const allowedInfographics = new Set(infographicScenes.slice(0, 2).map(s => s.index));
    
    for (const sc of infographicScenes) {
        if (!allowedInfographics.has(sc.index)) {
            console.log(`[VisualNormalizer] Scene ${sc.index + 1}: INFOGRAPHIC -> STOCK_VIDEO (Quota exceeded)`);
            sc.out.visualSource = "STOCK_VIDEO";
            if (!sc.downgradeReason) {
                sc.out.routingDowngradeReason = "MOTION_SUBSTITUTION"; 
            }
            sc.out.assetSearches = [
               { query: "abstract glowing loop", type: "video", purpose: "primary_motion_fallback" },
               { query: "science abstract background", type: "video", purpose: "secondary" }
            ];
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
    
    // Ensure AI prompt exists and is highly cinematic
    if (out.visualSource === "AI_IMAGE") {
      if (!out.generatedAssetPrompt || out.generatedAssetPrompt.length < 10) {
        out.generatedAssetPrompt = `Cinematic, surreal macro visualization of ${out.searchKeywords?.[0] || 'internal activity'}. Glowing, abstract, highly detailed 8k render, vertical composition, dramatic lighting.`;
      } else if (!out.generatedAssetPrompt.toLowerCase().includes("cinematic") && !out.generatedAssetPrompt.toLowerCase().includes("macro") && !out.generatedAssetPrompt.toLowerCase().includes("wide") && !out.generatedAssetPrompt.toLowerCase().includes("shot") && !out.generatedAssetPrompt.toLowerCase().includes("lighting")) {
        // Force cinematic cues if none appear to exist
        out.generatedAssetPrompt = `Cinematic perspective, dramatic lighting, highly detailed 8k render of: ${out.generatedAssetPrompt}`;
      }
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
