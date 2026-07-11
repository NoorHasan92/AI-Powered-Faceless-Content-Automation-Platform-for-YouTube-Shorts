// File Location: src/lib/subtitle-emphasis.ts
// Utility for dynamic word-level subtitle emphasis in ASS format.

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "of", "to", "and", "in", "on", "at", 
  "by", "for", "with", "about", "as", "it", "this", "that", "these", "those", "from", 
  "or", "but", "not", "be", "have", "has", "had", "will", "would", "can", "could", "should",
  "they", "their", "them", "we", "our", "us", "you", "your", "he", "his", "him", "she", "her",
  "i", "my", "me", "do", "does", "did", "so", "up", "out", "if", "then", "than", "what",
  "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
  "some", "such", "no", "nor", "too", "very", "every", "really", "just", "like", "into"
]);

const DOMAIN_KEYWORDS = new Set([
  // Science / Tech / General Domain
  "brain", "neuron", "neurons", "memory", "dna", "gravity", "quantum", "physics", 
  "science", "space", "galaxy", "universe", "time", "light", "energy", "data",
  "neural", "synapse", "subconscious", "imagery", "surreal", "activity", "infographic",
  "algorithm", "system", "technology", "artificial", "intelligence", "evolution",
  "human", "world", "earth", "planet", "star", "stars", "blackhole", "mind"
]);

/**
 * Calculates a weighted score for a word to determine if it should be emphasized.
 * Threshold for emphasis is 5.
 */
export function getWordScore(word: string): number {
  const cleanWord = word.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
  
  if (!cleanWord) return -100;
  if (STOP_WORDS.has(cleanWord)) return -100;

  // Penalize generic adverbs ending in 'ly'
  if (cleanWord.endsWith("ly") && cleanWord.length > 4) {
    return -5;
  }

  let score = 0;

  // Domain keywords - automatic emphasis
  if (DOMAIN_KEYWORDS.has(cleanWord)) score += 10;

  // Numbers and percentages - automatic emphasis
  if (/\d/.test(cleanWord)) score += 5;

  // All caps (e.g. NASA, DNA) - must be > 1 char
  const cleanNoPunctuation = word.replace(/[^a-zA-Z]/g, "");
  if (cleanNoPunctuation.length > 1 && cleanNoPunctuation === cleanNoPunctuation.toUpperCase()) {
    score += 6;
  }

  // Length heuristics
  if (cleanWord.length >= 8) score += 5; // Long words get automatic emphasis
  else if (cleanWord.length >= 6) score += 3;
  else if (cleanWord.length >= 5) score += 1;

  // Hyphenated words
  if (cleanWord.includes("-")) score += 3;

  return score;
}

// Cyan/Light Green color: &HFFFF00& (BGR for Cyan)
// Softer scale animation: 112% down to 100% over 150ms
const EMPHASIS_START = "{\\c&HFFFF00&\\fscx112\\fscy112\\t(0,150,\\fscx100\\fscy100)}";
// Targeted reset to default white and 100% scale
const EMPHASIS_RESET = "{\\c&HFFFFFF&\\fscx100\\fscy100}";

/**
 * Takes a raw subtitle string and wraps important words/phrases in ASS emphasis tags.
 */
export function emphasizeText(text: string): string {
  // Split by whitespace but keep the whitespace tokens to reconstruct the string perfectly
  const tokens = text.split(/(\s+)/);
  
  let result = "";
  let inEmphasis = false;

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      // It's whitespace, just append it
      result += token;
      continue;
    }

    const score = getWordScore(token);
    const shouldEmphasize = score >= 5;

    if (shouldEmphasize && !inEmphasis) {
      result += EMPHASIS_START + token;
      inEmphasis = true;
    } else if (shouldEmphasize && inEmphasis) {
      // Continue phrase-level emphasis
      result += token;
    } else if (!shouldEmphasize && inEmphasis) {
      // Close emphasis on this non-emphasized word
      result += EMPHASIS_RESET + token;
      inEmphasis = false;
    } else {
      // Not emphasized, not currently in emphasis
      result += token;
    }
  }

  // Close any trailing emphasis at the end of the text
  if (inEmphasis) {
    result += EMPHASIS_RESET;
  }

  return result;
}
