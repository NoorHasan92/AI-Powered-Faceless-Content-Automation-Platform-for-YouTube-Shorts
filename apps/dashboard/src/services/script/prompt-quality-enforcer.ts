// File Location: src/services/script/prompt-quality-enforcer.ts
// Lightweight validation pass that detects generic/low-quality AI prompts
// and automatically rewrites them into cinematic concept-art-level descriptions.
// Uses a Visual Blueprint intermediate layer to ensure diversity, continuity, and thematic aesthetics.

import type { ScriptResponse, SceneInput } from "@/validations/script.schema";
import { hashString, mulberry32, seededPick } from "@/lib/prng";

export interface ProjectContext {
  projectId: string;
  niche: string;
  duration: string;
}

// ---------------------------------------------------------------------------
// Interchangeable Vocabulary Pools
// ---------------------------------------------------------------------------

const LIGHTING_STYLES = [
  "dramatic volumetric lighting",
  "golden hour rim lighting with atmospheric haze",
  "cool blue subsurface scattering",
  "high-contrast chiaroscuro illumination",
  "ethereal bioluminescent glow",
  "cinematic three-point lighting with warm key",
  "harsh directional spotlight against deep shadows",
  "diffused ambient occlusion with soft fill",
  "neon-accented cyberpunk illumination",
  "natural window light with dust particles",
  "soft cinematic lighting",
  "moody backlighting",
  "golden edge lighting",
  "studio-grade illumination",
  "atmospheric glow"
];

const COMPOSITION_TECHNIQUES = [
  "anamorphic cinematic composition",
  "rule-of-thirds off-center framing",
  "central symmetry with leading lines",
  "diagonal dynamic composition",
  "negative space emphasizing isolation",
  "layered foreground-midground-background depth",
  "frame-within-frame compositional technique",
  "symmetrical framing",
  "dramatic foreground depth",
  "layered environmental composition",
  "cinematic framing"
];

const TEXTURE_DESCRIPTORS = [
  "hyper-realistic surface textures",
  "photorealistic organic textures with micro-detail",
  "crystalline translucent materials",
  "wet reflective metallic surfaces",
  "soft biological membrane textures",
  "weathered natural patina and grain",
  "ultra-detailed surfaces",
  "realistic material response",
  "intricate organic detail",
  "premium concept-art finish"
];

const ATMOSPHERE_TAGS = [
  "atmospheric fog",
  "floating dust particles caught in light",
  "volumetric god rays",
  "subtle lens flare",
  "atmospheric depth haze",
  "cinematic smoke wisps",
  "floating particles",
  "subtle fog",
  "drifting dust",
  "ethereal mist",
  "suspended light rays"
];

const MOODS = [
  "Wonder", "Curiosity", "Mystery", "Discovery", "Isolation", "Reflection", "Hope", "Awe", "Tension", "Melancholy"
];

// ---------------------------------------------------------------------------
// Domain Palettes & Intelligent Lenses
// ---------------------------------------------------------------------------

const DOMAIN_PALETTES: Record<string, string[]> = {
  neuroscience: ["Blue", "Cyan", "Purple", "White"],
  astronomy: ["Black", "Deep Blue", "Gold", "Orange"],
  biology: ["Green", "Emerald", "Teal", "White"],
  history: ["Amber", "Brown", "Bronze", "Dust"],
  physics: ["Deep Blue", "Electric Cyan", "Gold"],
  ocean: ["Turquoise", "Blue", "White", "Navy"],
  technology: ["Cyan", "White", "Dark Grey", "Black"],
  medical: ["White", "Blue", "Teal", "Clean Light"],
  psychology: ["Blue", "Purple", "Magenta", "Dark Grey"],
  default: ["Cinematic Teal and Orange", "High Contrast Neutral", "Moody Muted Tones"]
};

// ---------------------------------------------------------------------------
// Content Categories
// ---------------------------------------------------------------------------

interface ContentCategory {
  domain: string;
  keywords: string[];
  cameraAngles: string[];
  visualStyle: string;
  environmentHints: string[];
  recommendedLens: string;
}

const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    domain: "neuroscience",
    keywords: ["neuron", "neural", "synapse", "brain", "hippocampus", "cortex", "amygdala",
               "prefrontal", "cerebellum", "neurotransmitter", "serotonin", "dopamine",
               "adrenaline", "cortisol", "neural pathway", "nerve", "axon", "dendrite"],
    cameraAngles: [
      "ultra-cinematic macro photography inside a living brain",
      "impossible internal camera traversing neural architecture",
      "microscopic perspective revealing synaptic connections",
      "extreme close-up of bioluminescent neural tissue"
    ],
    visualStyle: "subsurface scattering, bioluminescent organic glow, 8k medical visualization",
    environmentHints: [
      "vast interconnected neural forest stretching into darkness",
      "electrical impulses cascading through crystalline neural pathways",
      "warm organic cavern of living brain tissue"
    ],
    recommendedLens: "100mm Macro"
  },
  {
    domain: "psychology",
    keywords: ["consciousness", "awareness", "perception", "mind", "thought", "thinking",
               "subconscious", "instinct", "intuition", "cognition", "mental",
               "memory", "remember", "recall", "forget", "nostalgia", "deja vu", "déjà vu",
               "dream", "sleep", "REM", "nightmare", "lucid", "imagination", "fantasy", "surreal"],
    cameraAngles: [
      "surreal first-person perspective dissolving into abstract space",
      "wide establishing shot of infinite consciousness landscape",
      "impossible camera movement through layers of awareness",
      "cinematic tracking shot through a dreamlike mental space",
      "cinematic dolly zoom through fragmenting memory space"
    ],
    visualStyle: "ethereal translucent layers, prismatic light refraction, dream-logic spatial distortion, temporal distortion effects",
    environmentHints: [
      "vast ethereal void where thoughts materialize as luminous structures",
      "infinite recursive mirror space representing self-awareness",
      "corridor of floating memory fragments dissolving at the edges",
      "shifting geometric landscape of pure consciousness"
    ],
    recommendedLens: "50mm Cinematic"
  },
  {
    domain: "psychology",
    keywords: ["emotion", "feeling", "fear", "anxiety", "joy", "sadness", "anger",
               "love", "grief", "empathy", "fight or flight", "stress", "panic"],
    cameraAngles: [
      "intimate extreme close-up capturing raw emotional intensity",
      "wide cinematic shot of emotional landscape metaphor",
      "low-angle dramatic composition emphasizing overwhelming scale",
      "over-the-shoulder introspective framing"
    ],
    visualStyle: "emotionally charged color grading, shallow depth of field, painterly soft focus edges, premium editorial photography",
    environmentHints: [
      "storm of color particles representing emotional turbulence",
      "serene to chaotic environmental transition",
      "abstract human silhouette surrounded by emotional energy"
    ],
    recommendedLens: "85mm Portrait"
  },
  {
    domain: "biology",
    keywords: ["cell", "DNA", "gene", "protein", "enzyme", "mitochondria", "ribosome",
               "chromosome", "mutation", "virus", "bacteria", "microscopic", "molecular",
               "amino acid", "RNA", "nucleus", "organelle", "membrane"],
    cameraAngles: [
      "electron microscope perspective with false-color enhancement",
      "impossible nano-scale camera inside a living cell",
      "cinematic macro photography of molecular machinery",
      "cross-sectional cutaway revealing internal cellular structure"
    ],
    visualStyle: "scientific visualization aesthetic, false-color electron microscopy, translucent biological materials",
    environmentHints: [
      "vast interior of a living cell with organelles as architectural structures",
      "DNA helix cathedral with light streaming through nucleotide windows",
      "protein machinery operating like a nanoscale factory"
    ],
    recommendedLens: "100mm Macro"
  },
  {
    domain: "physics",
    keywords: ["atom", "molecule", "quantum", "electron", "photon", "particle",
               "wave", "energy", "electromagnetic", "radiation", "fusion", "fission",
               "nuclear", "subatomic", "quark", "boson"],
    cameraAngles: [
      "impossible zoom from macro to quantum scale in single composition",
      "orbital perspective around atomic structure",
      "extreme close-up of quantum probability clouds",
      "isometric technical visualization of particle interaction"
    ],
    visualStyle: "quantum physics visualization, probability cloud rendering, particle trail photography, CERN-quality scientific art",
    environmentHints: [
      "shimmering quantum field with particles appearing and disappearing",
      "electron orbital shells glowing with probability distributions",
      "particle collision event frozen in time with energy traces"
    ],
    recommendedLens: "24mm Wide"
  },
  {
    domain: "astronomy",
    keywords: ["galaxy", "star", "nebula", "black hole", "cosmos", "universe", "space",
               "supernova", "singularity", "dark matter", "dark energy", "cosmic",
               "planetary", "asteroid", "comet", "solar"],
    cameraAngles: [
      "epic wide establishing shot of cosmic scale",
      "cinematic tracking shot through nebula clouds",
      "extreme telephoto compression of cosmic distance",
      "impossible perspective from inside a stellar phenomenon"
    ],
    visualStyle: "NASA/Hubble quality imagery, volumetric nebula gas, lens flare from stellar sources, IMAX documentary quality",
    environmentHints: [
      "swirling galaxy arm with billions of stars as points of light",
      "accretion disk of a black hole bending spacetime visually",
      "stellar nursery with newborn stars igniting in gas clouds"
    ],
    recommendedLens: "14mm Ultra Wide"
  },
  {
    domain: "history",
    keywords: ["evolution", "natural selection", "adaptation", "species", "fossil",
               "extinction", "geological", "tectonic", "magma", "volcano", "earth",
               "ocean", "atmospheric", "climate", "ecosystem"],
    cameraAngles: [
      "epic time-lapse perspective spanning geological ages",
      "cinematic aerial shot of primordial landscape",
      "cross-sectional visualization of earth's internal structure",
      "macro photography of fossilized ancient life"
    ],
    visualStyle: "National Geographic documentary quality, epic landscape photography, geological cross-section illustration",
    environmentHints: [
      "primordial earth with molten rock and primitive atmosphere",
      "cross-section of tectonic plates revealing magma chambers",
      "evolutionary progression landscape showing multiple geological eras"
    ],
    recommendedLens: "50mm Documentary"
  },
  {
    domain: "medical",
    keywords: ["heart", "lung", "blood", "organ", "muscle", "bone", "skin",
               "eye", "retina", "optic", "alveoli", "circulatory", "respiratory",
               "digestive", "immune", "antibody", "platelet"],
    cameraAngles: [
      "impossible internal camera traveling through the human body",
      "extreme macro of living tissue in cross-section",
      "cinematic endoscopic perspective with dramatic lighting",
      "isometric medical illustration with cutaway layers"
    ],
    visualStyle: "premium medical visualization, anatomical illustration quality, subsurface skin scattering",
    environmentHints: [
      "interior of a beating heart with blood flow dynamics",
      "branching bronchial tree with oxygen exchange in alveoli",
      "immune system battlefield with white blood cells engaging pathogens"
    ],
    recommendedLens: "Endoscopic Probe Lens"
  }
];

const FALLBACK_CATEGORY: ContentCategory = {
  domain: "default",
  keywords: [],
  cameraAngles: [
    "cinematic wide establishing shot with atmospheric perspective",
    "extreme close-up with shallow depth of field",
    "dramatic low-angle composition",
    "overhead documentary-style perspective"
  ],
  visualStyle: "premium documentary concept art, photorealistic rendering, cinematic color grading, 8k resolution",
  environmentHints: [
    "dramatic atmospheric environment with volumetric lighting",
    "abstract conceptual space with cinematic depth"
  ],
  recommendedLens: "35mm Cinematic"
};

// ---------------------------------------------------------------------------
// Generic Prompt Detection
// ---------------------------------------------------------------------------

const GENERIC_PATTERNS = [
  /^[a-z\s]{1,25}$/i,                      // Very short, single-concept prompts
  /^(a |the )?[a-z]+( [a-z]+)?$/i,         // Just one or two words
  /^(glowing|bright|dark|big|small) [a-z]+$/i, // Adjective + noun
  /^person (thinking|walking|standing|sitting|looking)$/i,
  /^(brain|neuron|cell|atom|heart|eye|star|planet)$/i,  // Bare nouns
];

const CINEMATIC_INDICATORS = [
  "cinematic", "volumetric", "dramatic lighting", "rim lighting",
  "macro photography", "telephoto", "wide shot", "establishing shot",
  "low angle", "depth of field", "anamorphic", "8k", "4k",
  "composition", "framing", "perspective", "concept art",
  "subsurface scattering", "global illumination", "chiaroscuro",
  "close-up", "overhead", "tracking", "documentary",
  "hyper-realistic", "photorealistic", "atmospheric"
];

const MIN_QUALITY_SCORE = 5;
const MIN_PROMPT_LENGTH = 40;

// ---------------------------------------------------------------------------
// Visual Blueprint System & Story Arc Engine
// ---------------------------------------------------------------------------

export type VisualEnergy = "LOW" | "MEDIUM" | "HIGH";
export type StoryStage = "HOOK" | "DISCOVERY" | "EXPLANATION" | "BUILDUP" | "REVEAL" | "EMOTIONAL_PAYOFF" | "CTA";

export interface CinematicIdentity {
  accentColors: string;
  lightingPhilosophy: string;
  atmospherePhilosophy: string;
  contrastProfile: string;
  colorTemperature: string;
  textureStyle: string;
}

export interface VisualBlueprint {
  subject: string;
  environment: string;
  camera: string;
  lighting: string;
  mood: string;
  atmosphere: string;
  composition: string;
  lens: string;
  palette: string;
  visualEnergy: VisualEnergy;
  visualStyle: string;
}

function determineVisualEnergy(sceneIndex: number, totalScenes: number, endingIntent?: string | null): VisualEnergy {
  if (sceneIndex === 0) return "HIGH";
  if (endingIntent === "EMOTIONAL_PAYOFF" || endingIntent === "CTA") return "HIGH";
  if (sceneIndex > 0 && sceneIndex < totalScenes - 1) return "MEDIUM";
  return "LOW";
}

function determineStoryStage(sceneIndex: number, totalScenes: number, endingIntent?: string | null): StoryStage {
  if (sceneIndex === 0) return "HOOK";
  if (sceneIndex === totalScenes - 1) {
    if (endingIntent === "EMOTIONAL_PAYOFF") return "EMOTIONAL_PAYOFF";
    return "CTA";
  }
  if (endingIntent === "EMOTIONAL_PAYOFF") return "EMOTIONAL_PAYOFF";

  const progress = sceneIndex / Math.max(1, totalScenes - 1);
  if (progress < 0.3) return "DISCOVERY";
  if (progress < 0.7) return "EXPLANATION";
  if (progress < 0.9) return "BUILDUP";
  return "REVEAL";
}

function generateCinematicIdentity(ctx: ProjectContext): CinematicIdentity {
  const random = mulberry32(hashString(`identity-${ctx.projectId}`));
  const domain = ctx.niche.toLowerCase();
  
  // Try to match domain, otherwise fallback
  let palettePool = DOMAIN_PALETTES["default"];
  for (const key of Object.keys(DOMAIN_PALETTES)) {
    if (domain.includes(key)) {
      palettePool = DOMAIN_PALETTES[key];
      break;
    }
  }

  return {
    accentColors: palettePool.join(", "),
    lightingPhilosophy: seededPick(["Soft volumetric glow", "Natural cinematic lighting", "High-contrast chiaroscuro", "Ethereal diffused light", "Moody cinematic shadows"], random),
    atmospherePhilosophy: seededPick(["Floating particles", "Subtle environmental fog", "Clean architectural clarity", "Dense cinematic haze", "Ethereal mist"], random),
    contrastProfile: seededPick(["High contrast", "Medium-high contrast", "Balanced contrast", "Soft low contrast"], random),
    colorTemperature: seededPick(["Warm golden", "Cool blue", "Neutral clean", "Moody desaturated", "Vibrant saturated"], random),
    textureStyle: seededPick(["Hyper-realistic organic", "Cinematic film grain", "Clean glossy finish", "Weathered documentary realism", "Premium concept-art polish"], random)
  };
}

function applyStoryStageEffects(stage: StoryStage, lighting: string, camera: string, composition: string) {
  let finalLighting = lighting;
  let finalCamera = camera;
  let finalComp = composition;

  switch (stage) {
    case "HOOK":
      finalLighting = `Intense ${lighting}`;
      finalComp = `Dramatic ${composition}`;
      break;
    case "DISCOVERY":
      finalComp = `Open ${composition}`;
      break;
    case "EXPLANATION":
      finalComp = `Clean, balanced ${composition}`;
      break;
    case "BUILDUP":
      finalCamera = `Dynamic ${camera}`;
      break;
    case "REVEAL":
      finalCamera = `Epic, large-scale ${camera}`;
      finalComp = `Most dramatic ${composition}`;
      break;
    case "EMOTIONAL_PAYOFF":
      finalLighting = `Elegant, reflective ${lighting}`;
      finalComp = `Beautiful, large-scale ${composition}`;
      break;
    case "CTA":
      finalLighting = `Bright, hopeful ${lighting}`;
      finalComp = `Open, optimistic ${composition}`;
      break;
  }
  return { lighting: finalLighting, camera: finalCamera, composition: finalComp };
}

function scorePromptQuality(prompt: string): number {
  if (!prompt || prompt.trim().length === 0) return 0;
  let score = 0;
  const lower = prompt.toLowerCase();

  if (prompt.length >= 200) score += 3;
  else if (prompt.length >= 100) score += 2;
  else if (prompt.length >= 50) score += 1;

  let cinematicHits = 0;
  for (const indicator of CINEMATIC_INDICATORS) {
    if (lower.includes(indicator)) cinematicHits++;
  }
  score += Math.min(cinematicHits, 5);

  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(prompt.trim())) score -= 3;
  }

  const commaCount = (prompt.match(/,/g) || []).length;
  if (commaCount >= 3) score += 2;
  else if (commaCount >= 1) score += 1;

  return Math.max(0, Math.min(10, score));
}

function findMatchingCategory(blob: string): ContentCategory {
  let bestCategory = FALLBACK_CATEGORY;
  let bestScore = 0;
  for (const cat of CONTENT_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (blob.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  return bestCategory;
}

/** Determines if two blueprints are highly similar in styling (>70% overlap of key stylistic words) */
function calculateStylisticSimilarity(bp1: VisualBlueprint, bp2: VisualBlueprint): number {
  const words1 = new Set([
    ...bp1.camera.split(/\s+/), ...bp1.lighting.split(/\s+/),
    ...bp1.atmosphere.split(/\s+/), ...bp1.composition.split(/\s+/)
  ].map(w => w.toLowerCase()));

  const words2 = new Set([
    ...bp2.camera.split(/\s+/), ...bp2.lighting.split(/\s+/),
    ...bp2.atmosphere.split(/\s+/), ...bp2.composition.split(/\s+/)
  ].map(w => w.toLowerCase()));

  if (words1.size === 0 && words2.size === 0) return 0;
  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }
  return intersection / Math.max(words1.size, words2.size);
}

function buildVisualBlueprint(
  scene: SceneInput,
  category: ContentCategory,
  sceneIndex: number,
  totalScenes: number,
  ctx: ProjectContext,
  lastThreeCameras: string[],
  identity: CinematicIdentity
): VisualBlueprint {
  // Use a PRNG seeded by projectId, scene index, and narration text for determinism
  const seedString = `${ctx.projectId}-${sceneIndex}-${scene.narrationText}`;
  const random = mulberry32(hashString(seedString));

  const energy = determineVisualEnergy(sceneIndex, totalScenes, scene.endingIntent);
  const stage = determineStoryStage(sceneIndex, totalScenes, scene.endingIntent);
  
  // Extract subject
  const subjectHints = [
    scene.visualPrompt,
    scene.narrationText,
    ...(scene.searchKeywords || [])
  ].filter(Boolean);
  const subjectDescription = subjectHints[0] || "abstract conceptual visualization";

  // Pick camera ensuring continuity (avoid repeating recent cameras if possible)
  let availableCameras = category.cameraAngles.filter(c => !lastThreeCameras.includes(c));
  if (availableCameras.length === 0) availableCameras = category.cameraAngles;
  const camera = seededPick(availableCameras, random);

  let mood = seededPick(MOODS, random);
  
  // Visual Energy influences Lighting
  let baseLighting = seededPick(LIGHTING_STYLES, random);
  if (energy === "HIGH") baseLighting = `intense ${baseLighting}`;
  else if (energy === "LOW") baseLighting = `subtle ${baseLighting}`;

  const baseComp = seededPick(COMPOSITION_TECHNIQUES, random);

  // Apply Story Stage Modifiers
  const effects = applyStoryStageEffects(stage, baseLighting, camera, baseComp);

  return {
    subject: subjectDescription.replace(/\.$/, ""),
    environment: seededPick(category.environmentHints, random),
    camera: effects.camera,
    lighting: `${effects.lighting} with ${identity.lightingPhilosophy}`,
    mood,
    atmosphere: `${seededPick(ATMOSPHERE_TAGS, random)}, ${identity.atmospherePhilosophy}`,
    composition: effects.composition,
    lens: category.recommendedLens,
    palette: `Accent Colors: ${identity.accentColors}. ${identity.contrastProfile}, ${identity.colorTemperature}, ${identity.textureStyle}`,
    visualEnergy: energy,
    visualStyle: category.visualStyle
  };
}

function rerollBlueprintStyle(bp: VisualBlueprint, category: ContentCategory, seedVariant: number, lastThreeCameras: string[]): VisualBlueprint {
  const random = mulberry32(hashString(`reroll-${seedVariant}-${bp.subject}`));
  let availableCameras = category.cameraAngles.filter(c => !lastThreeCameras.includes(c));
  if (availableCameras.length === 0) availableCameras = category.cameraAngles;
  
  return {
    ...bp,
    camera: seededPick(availableCameras, random),
    lighting: seededPick(LIGHTING_STYLES, random),
    atmosphere: seededPick(ATMOSPHERE_TAGS, random),
    composition: seededPick(COMPOSITION_TECHNIQUES, random),
    environment: seededPick(category.environmentHints, random)
  };
}

function assemblePrompt(bp: VisualBlueprint): string {
  // Consistent order: Subject -> Camera -> Env -> Light -> Comp -> Atmos -> Texture -> Lens -> Palette -> Quality
  return `${bp.subject}, ${bp.environment}. ` +
         `${bp.camera}, shot on ${bp.lens}, ${bp.composition}. ` +
         `Mood: ${bp.mood}. ${bp.lighting}, ${bp.atmosphere}. ` +
         `${bp.palette}. ${bp.visualStyle}, vertical composition.`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function enforcePromptQuality(script: ScriptResponse, ctx: ProjectContext): ScriptResponse {
  let rewriteCount = 0;
  
  // Generate the project's fixed Cinematic Identity once
  const identity = generateCinematicIdentity(ctx);

  // Rolling history of last 3 primary cameras for scene-to-scene continuity
  const lastThreeCameras: string[] = [];
  const previousBlueprints: VisualBlueprint[] = [];

  const enhancedScenes = script.scenes.map((scene, index) => {
    if (scene.visualSource !== "AI_IMAGE" && scene.visualSource !== "INFOGRAPHIC") {
      return scene;
    }

    const prompt = scene.generatedAssetPrompt;
    if (!prompt && scene.visualSource !== "AI_IMAGE") return scene;

    const quality = scorePromptQuality(prompt || "");
    const needsRewrite = !prompt || prompt.length < MIN_PROMPT_LENGTH || quality < MIN_QUALITY_SCORE;

    if (!needsRewrite) {
      // Still record its camera if possible to maintain continuity, though we don't have a blueprint
      if (prompt) lastThreeCameras.push(prompt.substring(0, 50)); // proxy for camera
      if (lastThreeCameras.length > 3) lastThreeCameras.shift();
      return scene;
    }

    const blob = [
      scene.narrationText,
      scene.visualPrompt,
      scene.onScreenCaption,
      prompt || "",
      ...(scene.searchKeywords || [])
    ].filter(Boolean).join(" ").toLowerCase();

    const category = findMatchingCategory(blob);
    let blueprint = buildVisualBlueprint(scene, category, index, script.scenes.length, ctx, lastThreeCameras, identity);

    // Diversity Validation against previous scenes
    for (const prevBp of previousBlueprints) {
      if (calculateStylisticSimilarity(blueprint, prevBp) > 0.70) {
        let rerolls = 0;
        while (calculateStylisticSimilarity(blueprint, prevBp) > 0.70 && rerolls < 3) {
          rerolls++;
          blueprint = rerollBlueprintStyle(blueprint, category, rerolls, lastThreeCameras);
        }
      }
    }

    // Maintain continuity history
    lastThreeCameras.push(blueprint.camera);
    if (lastThreeCameras.length > 3) lastThreeCameras.shift();
    previousBlueprints.push(blueprint);

    const newPrompt = assemblePrompt(blueprint);
    rewriteCount++;

    console.log(
      `[PromptEnforcer] Scene ${index + 1}: Rewrote generic prompt ` +
      `(quality=${quality}/10, len=${(prompt || "").length}) → cinematic prompt (len=${newPrompt.length})`
    );

    return {
      ...scene,
      generatedAssetPrompt: newPrompt
    };
  });

  if (rewriteCount > 0) {
    console.log(`[PromptEnforcer] Rewrote ${rewriteCount}/${script.scenes.length} prompts for cinematic quality.`);
  }

  return {
    ...script,
    scenes: enhancedScenes
  };
}
