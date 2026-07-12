// File Location: src/services/image-generation/cloudflare.provider.ts
// Cloudflare Workers AI image generation provider.
// Calls a self-hosted Cloudflare Worker (free-image-generation-api) to produce images.
// Includes single-retry with exponential backoff for transient errors,
// and granular error classification (quota / auth / network).

import type {
  ImageGenerationProvider,
  ImageGenerationResult,
  ImageGenerationOptions,
} from "./types";
import { ImageGenerationError } from "./types";

/** Maximum time (ms) to wait for image generation before aborting. */
const GENERATION_TIMEOUT_MS = 30_000;

/** HTTP status codes considered transient (worth retrying). */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** Base delay (ms) for exponential backoff on retry. */
const RETRY_BASE_DELAY_MS = 2_000;

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
 * Classify an HTTP error response into a granular error code.
 */
function classifyHttpError(
  status: number,
  body: string,
  headers?: Headers
): ImageGenerationError {
  // Log headers for quota/rate-limit errors to aid debugging
  if (status === 429 || body.toLowerCase().includes("quota") || body.toLowerCase().includes("rate limit")) {
    const headerInfo = headers
      ? Object.fromEntries([...headers.entries()].filter(([k]) =>
          k.toLowerCase().includes("retry") ||
          k.toLowerCase().includes("limit") ||
          k.toLowerCase().includes("remaining")
        ))
      : {};
    console.error(
      `[CloudflareAI] QUOTA ERROR — Status: ${status}\n` +
      `  Body: ${body.slice(0, 500)}\n` +
      `  Rate-Limit Headers: ${JSON.stringify(headerInfo)}`
    );
    return new ImageGenerationError(
      `Image generation quota/rate-limit error (HTTP ${status}): ${body.slice(0, 200)}`,
      "IMAGE_PROVIDER_QUOTA",
      status,
      body
    );
  }

  if (status === 401 || status === 403) {
    console.error(
      `[CloudflareAI] AUTH ERROR — Status: ${status}\n` +
      `  Body: ${body.slice(0, 500)}`
    );
    return new ImageGenerationError(
      `Image generation authentication failed (HTTP ${status}): ${body.slice(0, 200)}`,
      "IMAGE_PROVIDER_AUTH",
      status,
      body
    );
  }

  // Generic server error
  return new ImageGenerationError(
    `Cloudflare image generation failed (HTTP ${status}): ${body.slice(0, 200)}`,
    "IMAGE_GENERATION_FAILED",
    status,
    body
  );
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
 *
 * Retry strategy: one retry with exponential backoff for transient HTTP errors
 * (429, 500, 502, 503, 504). Auth errors and permanent failures fail immediately.
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

    // Attempt generation with one retry for transient errors
    let lastError: Error | null = null;
    const maxAttempts = 2; // initial + 1 retry

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.attemptGeneration(prompt, width, height);
        return result;
      } catch (err: any) {
        lastError = err;

        // Don't retry auth errors or non-retryable failures
        if (err instanceof ImageGenerationError) {
          if (err.code === "IMAGE_PROVIDER_AUTH") {
            throw err; // permanent — no retry
          }
          if (err.httpStatus && !RETRYABLE_STATUS_CODES.has(err.httpStatus)) {
            throw err; // permanent HTTP error — no retry
          }
        }

        if (attempt < maxAttempts) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(
            `[CloudflareAI] Attempt ${attempt}/${maxAttempts} failed (${err?.message || String(err)}). ` +
            `Retrying in ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts exhausted
    throw lastError || new ImageGenerationError(
      "Image generation failed after all retry attempts",
      "IMAGE_GENERATION_FAILED"
    );
  }

  /**
   * Single generation attempt with timeout.
   */
  private async attemptGeneration(
    prompt: string,
    width: number,
    height: number
  ): Promise<ImageGenerationResult> {
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
        throw new ImageGenerationError(
          `Image generation timed out after ${GENERATION_TIMEOUT_MS / 1000}s`,
          "IMAGE_PROVIDER_NETWORK"
        );
      }
      throw new ImageGenerationError(
        `Image generation network error: ${err?.message || String(err)}`,
        "IMAGE_PROVIDER_NETWORK"
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw classifyHttpError(response.status, errorText, response.headers);
    }

    const contentType = response.headers.get("content-type") || "";

    // Case 1: Worker returns raw image bytes
    if (contentType.startsWith("image/")) {
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new ImageGenerationError(
          "Image generation returned an empty image (0 bytes)",
          "IMAGE_GENERATION_FAILED"
        );
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
          throw new ImageGenerationError(
            "Image generation returned empty base64 data",
            "IMAGE_GENERATION_FAILED"
          );
        }
        return { buffer: buf, extension: "jpg" };
      }

      throw new ImageGenerationError(
        "Cloudflare Worker returned JSON but no recognizable image field. " +
        `Keys received: ${Object.keys(json).join(", ")}`,
        "IMAGE_GENERATION_FAILED"
      );
    }

    // Case 3: Unknown content type — try reading as binary
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 0) {
      return { buffer: Buffer.from(arrayBuffer), extension: "png" };
    }

    throw new ImageGenerationError(
      `Cloudflare Worker returned an empty response (content-type: ${contentType || "none"})`,
      "IMAGE_GENERATION_FAILED"
    );
  }
}
