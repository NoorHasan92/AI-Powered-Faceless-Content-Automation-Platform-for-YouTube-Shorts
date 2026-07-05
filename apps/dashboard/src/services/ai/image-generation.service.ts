// File Location: src/services/ai/image-generation.service.ts
import Replicate from "replicate";

// Ensure the token is available
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface ImageGenerationResult {
  url?: string;
  buffer?: Buffer;
  extension: string;
}

/**
 * Generates an AI image using Replicate (Flux.1 Schnell).
 * @param prompt The descriptive visual prompt
 * @param orientation Aspect ratio
 */
export async function generateImage(
  prompt: string, 
  orientation: "portrait" | "landscape" | "square" = "portrait"
): Promise<ImageGenerationResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not configured.");
  }

  let aspectRatio = "9:16";
  if (orientation === "landscape") aspectRatio = "16:9";
  if (orientation === "square") aspectRatio = "1:1";

  const output = await replicate.run(
    "black-forest-labs/flux-schnell",
    {
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        output_format: "jpg",
        output_quality: 90
      }
    }
  );

  if (Array.isArray(output) && output.length > 0) {
    const file = output[0];
    
    // In Replicate v1+, this is a File/Blob-like object.
    if (typeof file.url === 'function') {
      return { url: file.url(), extension: "jpg" };
    } 
    
    // Fallback to arrayBuffer if it's purely a blob in memory
    if (typeof file.arrayBuffer === 'function') {
      const arrayBuffer = await file.arrayBuffer();
      return { buffer: Buffer.from(arrayBuffer), extension: "jpg" };
    }

    // Fallback if it's just a string URL
    if (typeof file === 'string') {
       return { url: file, extension: "jpg" };
    }
  }

  throw new Error("Failed to generate image or unrecognized output format from Replicate.");
}
