// File Location: src/services/image-generation/cloudflare.provider.ts
// Cloudflare Workers AI image generation provider.
// Calls a self-hosted Cloudflare Worker (free-image-generation-api) to produce images.
// No payment handling, no retries, no circuit breakers — just a clean HTTP call.

import type {
  ImageGenerationProvider,
  ImageGenerationResult,
  ImageGenerationOptions,
} from "./types";

/** Maximum time (ms) to wait for image generation before aborting. */
const GENERATION_TIMEOUT_MS = 30_000;

/**
 * Resolves orientation + optional explicit dimensions into width/height.
 */
function resolveSize(options?: ImageGenerationOptions): { width: number; height: number } {
  if (options?.width && options?.height) {
    return { width: options.width, height: options.height };
  }

  switch (options?.orientation) {
    case "landscape":
      return { width: 1920, height: 1080 };
    case "square":
      return { width: 1024, height: 1024 };
    case "portrait":
    default:
      return { width: 1080, height: 1920 };
  }
}

/**
 * Cloudflare Workers AI provider.
 *
 * Expects the Worker to accept:
 *   POST /  { prompt, width, height }
 *
 * And return raw image bytes (PNG) with Content-Type: image/png.
 *
 * If the Worker returns JSON (e.g. { image: "<base64>" }), we handle that too.
 */
export class CloudflareImageProvider implements ImageGenerationProvider {
  readonly name = "cloudflare";
  private readonly gatewayUrl: string;
  private readonly apiKey: string | undefined;

  constructor(gatewayUrl?: string, apiKey?: string) {
    const url = gatewayUrl || process.env.CLOUDFLARE_AI_GATEWAY_URL;
    if (!url) {
      throw new Error(
        "CLOUDFLARE_AI_GATEWAY_URL is not configured. " +
        "Set it in your .env file to point to your Cloudflare Worker."
      );
    }
    this.gatewayUrl = url.replace(/\/+$/, ""); // strip trailing slashes
    this.apiKey = apiKey || process.env.CLOUDFLARE_AI_API_KEY;
  }

  async generate(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const { width, height } = resolveSize(options);

    console.log(
      `[CloudflareAI] Generating image: ${width}x${height} — "${prompt.slice(0, 80)}…"`
    );

    // Abort if the Worker doesn't respond within the timeout.
    // This prevents a hung network call from blocking the entire asset pipeline.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    let response: Response;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      response = await fetch(this.gatewayUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, width, height, steps: 4 }),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        throw new Error(
          `Image generation timed out after ${GENERATION_TIMEOUT_MS / 1000}s`
        );
      }
      throw new Error(
        `Image generation network error: ${err?.message || String(err)}`
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Cloudflare image generation failed (HTTP ${response.status}): ${errorText}`
      );
    }

    const contentType = response.headers.get("content-type") || "";

    // Case 1: Worker returns raw image bytes
    if (contentType.startsWith("image/")) {
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error("Image generation returned an empty image (0 bytes)");
      }
      const extension = contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : "png";
      return { buffer: Buffer.from(arrayBuffer), extension };
    }

    // Case 2: Worker returns JSON with base64-encoded image
    if (contentType.includes("application/json")) {
      const json = await response.json() as Record<string, unknown>;

      // Support common response shapes: { image: "base64..." } or { result: { image: "base64..." } }
      const base64 =
        (json.image as string) ||
        ((json.result as Record<string, unknown>)?.image as string);

      if (base64 && typeof base64 === "string") {
        const buf = Buffer.from(base64, "base64");
        if (buf.byteLength === 0) {
          throw new Error("Image generation returned empty base64 data");
        }
        return { buffer: buf, extension: "jpg" };
      }

      throw new Error(
        "Cloudflare Worker returned JSON but no recognizable image field. " +
        `Keys received: ${Object.keys(json).join(", ")}`
      );
    }

    // Case 3: Unknown content type — try reading as binary
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 0) {
      return { buffer: Buffer.from(arrayBuffer), extension: "png" };
    }

    throw new Error(
      `Cloudflare Worker returned an empty response (content-type: ${contentType || "none"})`
    );
  }
}
