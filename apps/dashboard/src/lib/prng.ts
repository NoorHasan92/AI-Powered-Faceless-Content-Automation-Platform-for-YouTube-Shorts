// File Location: src/lib/prng.ts
// Seeded pseudo-random number generator for deterministic operations.

/**
 * Generates a 32-bit hash from a string.
 */
export function hashString(str: string): number {
  let h = 0xdeadbeef;
  for(let i = 0; i < str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  return (h ^ h >>> 16) >>> 0;
}

/**
 * Mulberry32 PRNG algorithm.
 * Returns a function that produces deterministic pseudo-random numbers between 0 and 1.
 */
export function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Shuffles an array in place using a seeded PRNG.
 */
export function seededShuffle<T>(array: T[], random: () => number): T[] {
  let currentIndex = array.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

/**
 * Picks a random item from an array using a seeded PRNG.
 */
export function seededPick<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)];
}
