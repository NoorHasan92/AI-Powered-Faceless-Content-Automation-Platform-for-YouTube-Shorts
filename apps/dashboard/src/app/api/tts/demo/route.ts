import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { PassThrough } from "stream";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const voice = url.searchParams.get("voice") || "en-US-AvaMultilingualNeural";
    const text = "Hi, this is a sample of my voice for your next video.";
    
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    
    // Create a passthrough stream
    const readable = new PassThrough();
    
    // msedge-tts supports piping to a stream via toStream()
    const ttsStream = tts.toStream(text);
    ttsStream.audioStream.pipe(readable);
    
    return new NextResponse(readable as any, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600", // cache the demo for an hour
      },
    });
  } catch (error) {
    console.error("Demo TTS error:", error);
    return new NextResponse("Failed to generate demo audio", { status: 500 });
  }
}
