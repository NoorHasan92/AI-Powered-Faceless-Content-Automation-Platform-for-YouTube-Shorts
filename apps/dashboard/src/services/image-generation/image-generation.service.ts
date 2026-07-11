// File Location: src/services/image-generation/image-generation.service.ts
// Facade service for image generation.
// The rest of the application calls ONLY this module — never a provider directly.
// Swapping providers is a one-line change here; no other file needs modification.

import type { ImageGenerationResult, ImageGenerationProvider } from "./types";
import { CloudflareImageProvider } from "./cloudflare.provider";

// ---------------------------------------------------------------------------
// Provider singleton — initialized lazily on first use
// ---------------------------------------------------------------------------

/**
 * Maximum time (ms) the facade will wait for ANY provider before aborting.
 * This is a defense-in-depth safety net — individual providers should have
 * their own tighter timeouts, but this guarantees the asset pipeline never hangs.
 */
const FACADE_TIMEOUT_MS = 45_000;

let _provider: ImageGenerationProvider | null = null;

function getProvider(): ImageGenerationProvider {
  if (!_provider) {
    _provider = new CloudflareImageProvider();
  }
  return _provider;
}

/**
 * Override the active provider (useful for testing or runtime swapping).
 */
export function setImageGenerationProvider(provider: ImageGenerationProvider): void {
  _provider = provider;
}

// ---------------------------------------------------------------------------
// Public API — this is the ONLY function the rest of the app should call
// ---------------------------------------------------------------------------

/**
 * Generate an AI image from a text prompt.
 *
 * @param prompt - Descriptive visual prompt for the image
 * @param orientation - Target aspect ratio (defaults to portrait for Shorts)
 * @returns Buffer + extension ready to be written to disk
 * @throws Error if generation fails or times out
 */
export async function generateImage(
  prompt: string,
  orientation: "portrait" | "landscape" | "square" = "portrait"
): Promise<ImageGenerationResult> {
  const provider = getProvider();
  console.log(`[ImageGeneration] Using provider: ${provider.name}`);

  // Defense-in-depth: even if a provider has no internal timeout,
  // the facade guarantees the pipeline won't hang indefinitely.
  const result = await Promise.race([
    provider.generate(prompt, { orientation }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Image generation timed out after ${FACADE_TIMEOUT_MS / 1000}s (facade timeout)`)),
        FACADE_TIMEOUT_MS
      )
    ),
  ]);

  // Validate the result is usable before returning to the caller.
  if (!result.buffer || result.buffer.byteLength === 0) {
    throw new Error("Image generation returned an empty buffer");
  }

  return result;
}
