import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const voice = url.searchParams.get("voice") || "en-US-AvaMultilingualNeural";
    const text = "Hi, this is a sample of my voice for your next video.";
    
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    
    const ttsStream = tts.toStream(text);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      ttsStream.audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      ttsStream.audioStream.on("end", () => resolve());
      ttsStream.audioStream.on("error", (err) => reject(err));
    });

    const buffer = Buffer.concat(chunks);
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Demo TTS error:", error);
    return new NextResponse("Failed to generate demo audio", { status: 500 });
  }
}
