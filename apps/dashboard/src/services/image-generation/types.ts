// File Location: src/services/image-generation/types.ts
// Provider-agnostic interfaces for the image generation subsystem.
// The rest of the application depends ONLY on these types — never on a specific provider.

/**
 * The result of a successful image generation.
 * Always returns a Buffer so the caller can write it to disk directly.
 */
export interface ImageGenerationResult {
  buffer: Buffer;
  extension: string; // e.g. "png", "jpg"
}

/**
 * Options for controlling image generation output.
 */
export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  orientation?: "portrait" | "landscape" | "square";
}

/**
 * Contract that every image generation provider must implement.
 * Adding a new provider (e.g. Stability AI, DALL-E) means implementing
 * this single interface — nothing else in the codebase changes.
 */
export interface ImageGenerationProvider {
  readonly name: string;
  generate(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
}
