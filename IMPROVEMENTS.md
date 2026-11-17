# ShortForge Engineering Improvements & Research Log

> **Status**: Planned for batch implementation  
> **Target**: Comprehensive platform polish, cinematic subtitle transitions, studio broadcast voiceover, and precision synchronization.

This document logs architectural research, root-cause analyses, and implementation blueprints for all upcoming system improvements. Changes will be implemented in a single unified release to maximize build efficiency.

---

## Table of Contents
1. [Improvement 1: Ultra-Smooth Subtitle Transitions & Sub-Millisecond Audio Alignment](#improvement-1-ultra-smooth-subtitle-transitions--sub-millisecond-audio-alignment)
2. [Improvement 2: Studio-Grade Voiceover Mastering & Pitch Drop Elimination](#improvement-2-studio-grade-voiceover-mastering--pitch-drop-elimination)
3. [Improvement 3: Audio Sidechain Ducking & Dynamic Sound Design](#improvement-3-audio-sidechain-ducking--dynamic-sound-design)
4. [Improvement 4: Smart Visual Cropping & Ken Burns Pan-Zoom Engine](#improvement-4-smart-visual-cropping--ken-burns-pan-zoom-engine)
5. [Improvement 5: Native In-Browser Video Scrubbing & Scene Timeline Editor](#improvement-5-native-in-browser-video-scrubbing--scene-timeline-editor)
6. [Implementation Checklist](#implementation-checklist)

---

## Improvement 1: Ultra-Smooth Subtitle Transitions & Sub-Millisecond Audio Alignment

### 1.1 The Issue: "Glitchy & Rough" Transitions
While subtitle timing and positioning have improved, subtitle transitions currently exhibit visual roughness:
- **Lateral Text Jitter**: When words are individually emphasized using `{\fscx112\fscy112\t(0,150,\fscx100\fscy100)}`, FFmpeg's `libass` font rasterizer recalculates the bounding box and kerning of that individual word during the 150ms animation. This causes adjacent words on the same line to jump horizontally, producing a distracting flicker or shaking effect.
- **Abrupt Hard Cuts**: Dialogue events end and start abruptly on raw milliseconds without alpha fading. If the audio has a micro-pause, the text blinks out and snaps back in instantly.
- **Sub-Frame Desynchronization**: Subtitle start/end timestamps are not aligned to video frame boundaries (e.g., 30fps = 33.33ms per frame). A subtitle event starting at `00:01:02.14` renders midway between frame 64 and frame 65, creating visual tearing or a 1-frame ghost flash.

### 1.2 Deep Research: Web & ASS Subtitle Mechanics

#### A. Box-Level Spring Animations vs. Inline Word Scaling
Instead of scaling individual words inside an inline string (which alters character spacing and causes jitter), professional short-form editors (e.g., CapCut, OpusClip) animate the entire phrase container:
```ass
;; Smooth entry pop: Container scales from 94% to 100% with smooth alpha fade in 80ms
Dialogue: 0,0:00:01.20,0:00:03.45,Default,,0,0,0,,{\fad(70,50)\fscx94\fscy94\t(0,80,\fscx100\fscy100)}The Earth is constantly broadcasting seismic signals.
```

#### B. Karaoke-Style Active Word Highlighting (`\kf` / Color Shifts)
To highlight the currently spoken word without layout shifting, use ASS Karaoke timing tags (`\kf<duration_cs>`) or targeted color overrides (`\c&H00FFFF&`). Changing only the color (`\c`) or alpha (`\alpha`) never alters glyph metrics, completely eliminating horizontal jumping:
```ass
;; Active word highlights in Vibrant Yellow (&H00E5FF& BGR) while remaining words stay White (&HFFFFFF&)
Dialogue: 0,0:00:01.20,0:00:03.45,Default,,0,0,0,,{\c&H00E5FF&}Deep{\c&HFFFFFF&} inside the ocean trench, sound travels forever.
```

#### C. Frame-Snapping Quantization (30 FPS Alignment)
All subtitle event start and end timestamps must be rounded to the nearest video frame boundary ($t_{\text{frame}} = \text{round}(t / 0.03333) \times 0.03333$):
```ts
export function snapToVideoFrame(seconds: number, fps = 30): number {
  const frameDuration = 1 / fps;
  return Math.round(seconds / frameDuration) * frameDuration;
}
```

### 1.3 Deep Research: Audio-Subtitle Forced Alignment Methodologies

| Methodology | Precision | Dependencies | Resource Cost | Feasibility in Current Stack |
|---|---|---|---|---|
| **1. Edge-TTS Ground-Truth Word Boundaries** | $\pm 30\text{ms}$ | Native `msedge-tts` metadata | Zero extra overhead | **Recommended (Immediate)** |
| **2. CTC Forced Alignment (wav2vec2)** | $\pm 10\text{ms}$ | Python / PyTorch / ONNX model | ~200MB memory | Candidate for Worker container |
| **3. WhisperX Phoneme Alignment** | $\pm 5\text{ms}$ | Whisper + wav2vec2 CTC | Heavy (1GB+ RAM) | Exceeds Render Free Tier |
| **4. Audio Envelope VAD Snapping** | $\pm 20\text{ms}$ | Web Audio API / FFmpeg `silencedetect` | Low | Great for silence boundary cleanup |

#### Proposed Alignment Architecture
1. **Calibration Offset**: Microsoft Edge TTS emits word boundaries measured from the audio stream generation, but MP3 encoding introduces a ~40ms decoder padding latency. By applying an automatic **$-40\text{ms}$ latency offset** (`start = Math.max(0, rawOffset - 0.040)`), subtitles align perfectly with the speaker's vocal plosives.
2. **Dynamic Grouping Algorithm**: Group words by grammatical phrase (2–4 words maximum per card) with a strict constraint: if silence between words exceeds $350\text{ms}$, immediately close the current subtitle card so text never lingers during pauses.

---

## Improvement 2: Studio-Grade Voiceover Mastering & Pitch Drop Elimination

### 2.1 The Issue: "Sudden Pitch Downs & Cough/Raspy Voice"
Edge-TTS neural voices (e.g., `en-US-AvaMultilingualNeural`, `en-US-BrianMultilingualNeural`) occasionally exhibit vocal anomalies:
- A sudden drop in pitch or volume in the middle of a sentence.
- A raspy, breathy quality ("losing their voice") as if clearing their throat or whispering.
- Inconsistent audio levels between adjacent scenes.

### 2.2 Root Cause Analysis

#### A. Unsanitized Text Triggers
Neural TTS models predict prosody from punctuation and casing. When scripts contain:
- Parenthetical notes: `(1816)`, `[RESEARCH]`
- Abbreviations & acronyms: `NOAA`, `SOFAR`, `16,000 psi`
- Formatting symbols: `—`, `...`, `*`, `~`, `'`
The neural engine interprets parentheses and em-dashes as an "aside" or whispered drop in tone, lowering the pitch by up to 2 octaves. Acronyms without spaces force the model into hesitation tokens, producing vocal rasp.

#### B. Absence of SSML Prosody Constraints
Without explicit SSML `<prosody>` and style declarations, the TTS engine uses unconstrained expressive prosody. In scientific or mystery scripts, it over-indexes on dramatic tension, causing the voice to drop into an audible vocal fry.

#### C. Unprocessed Raw Audio
Raw 24kHz MP3 audio from Edge-TTS contains sub-bass plosives (<80Hz) and dynamic range peaks. Without dynamic range compression and loudness normalization, soft syllables become inaudible while loud syllables dominate.

### 2.3 Proposed Solution: 3-Tier Audio Pipeline

#### Tier 1: Phonetic & Punctuation Sanitizer Pre-Processor
Before text is sent to the TTS engine, run it through a dedicated phonetic normalizer:
```ts
export function sanitizeTextForTTS(text: string): string {
  return text
    // Expand numbers with commas: "36,000" -> "36000" (pronounced thirty-six thousand)
    .replace(/(\d+),(\d+)/g, "$1$2")
    // Expand acronyms: "NOAA" -> "N.O.A.A.", "SOFAR" -> "So-far"
    .replace(/\bNOAA\b/g, "N.O.A.A.")
    .replace(/\bSOFAR\b/g, "So-Far")
    // Replace em-dashes and long hyphens with clean commas for natural pausing
    .replace(/[—–]/g, ", ")
    // Remove brackets, asterisks, and citation markers
    .replace(/[\[\]\(\)\*]/g, "")
    // Eliminate ellipsis dots that cause pitch drops
    .replace(/\.{2,}/g, ".")
    // Normalize quotes
    .replace(/["“”'‘’]/g, "")
    .trim();
}
```

#### Tier 2: SSML Prosody & Style Enforcement
Wrap clean text in explicit Azure SSML with locked prosody:
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="en-US-BrianMultilingualNeural">
    <mstts:express-as style="narration-professional" styledegree="1">
      <prosody rate="+0%" pitch="+0Hz" volume="+0%">
        {{sanitized_narration_text}}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>
```

#### Tier 3: FFmpeg Broadcast Studio Mastering Chain
Process every generated voiceover scene through an automated broadcast mastering filter:
```bash
# High-pass filter removes microphone rumble; parametric EQ clears mud; 
# multiband compressor evens out speech; loudnorm ensures broadcast loudness (-16 LUFS)
ffmpeg -i raw_scene.mp3 -af \
  "highpass=f=80, \
   equalizer=f=3000:t=q:w=1.2:g=-1.5, \
   equalizer=f=120:t=q:w=1:g=+1.0, \
   acompressor=threshold=-18dB:ratio=3.2:attack=8:release=60:makeup=2dB, \
   loudnorm=I=-16:TP=-1.5:LRA=9" \
  mastered_scene.mp3
```

---

## Improvement 3: Audio Sidechain Ducking & Dynamic Sound Design

### 3.1 The Issue
Background music (BGM) currently plays at a fixed 12% volume throughout the video. During scenes with silent pauses, the music does not swell, and during dense dialogue, music occasionally clashes with narration.

### 3.2 Solution: Automated FFmpeg Sidechain Compression (`sidechaincompress`)
Use FFmpeg's `sidechaincompress` filter so BGM volume dynamically ducks to 8% when the narrator speaks, and automatically swells to 22% during dramatic transitions and pauses:
```bash
ffmpeg -i scenes_concat.mp4 -i bgm.mp3 -filter_complex \
  "[1:a]asplit=2[bgm_main][bgm_sc]; \
   [bgm_main][0:a]sidechaincompress=threshold=0.08:ratio=4:attack=50:release=400[ducked_bgm]; \
   [0:a][ducked_bgm]amix=inputs=2:duration=first[outa]" \
  -map 0:v -map "[outa]" -c:v copy final.mp4
```

---

## Improvement 4: Smart Visual Cropping & Ken Burns Pan-Zoom Engine

### 4.1 The Issue
Horizontal stock footage (16:9) centered in vertical shorts (9:16) sometimes cuts off key action subjects located at the thirds of the frame. Static stock images feel motionless compared to video B-roll.

### 4.2 Solution
1. **Dynamic Ken Burns Multi-Axis Interpolation**:
   - Alternate between 3 camera movements:
     - *Slow Push-In*: $z=1.00 \to 1.15$ toward center.
     - *Slow Pan-Up*: Tracking from bottom third to upper third (ideal for tall vertical subjects).
     - *Gentle Drift*: Subtly drifting across the horizon.
2. **Smart Saliency Cropping**:
   - For 16:9 videos placed into 9:16 vertical shorts, calculate anchor focus based on visual role (e.g., face detection or centered rule-of-thirds).

---

## Improvement 5: Native In-Browser Video Scrubbing & Scene Timeline Editor

### 5.1 The Issue
Creators cannot preview individual scene clips or adjust word timings without downloading the final MP4.

### 5.2 Solution
- Build an interactive, lightweight **Scene Storyboard Player** in the Studio workspace:
  - Play individual scene clips with active subtitles rendered in HTML5/Canvas.
  - Inline subtitle text editor allowing creators to fix typo words before triggering video compilation.

---

## Implementation Checklist

- [ ] **Phase 1: Subtitle Smoothness & Alignment**
  - [ ] Update `ass-utils.ts`: Replace inline word scale animation with line-level pop (`\fscx95\fscy95\t(0,70,\fscx100\fscy100)`).
  - [ ] Add `\fad(60, 50)` alpha cross-fading on all dialogue events.
  - [ ] Implement `snapToVideoFrame` (30 FPS quantization) on subtitle start/end timestamps.
  - [ ] Implement $-40\text{ms}$ MP3 encoder calibration offset.
- [ ] **Phase 2: Voiceover Mastering & Stability**
  - [ ] Create `sanitizeTextForTTS` pre-processor (normalize numbers, expand acronyms, remove brackets).
  - [ ] Wrap requests in structured Azure SSML with locked prosody (`pitch="+0Hz"`, `rate="+0%"`).
  - [ ] Add FFmpeg audio mastering filter pass (`highpass=80`, `acompressor`, `loudnorm`) in `voiceover.service.ts`.
- [ ] **Phase 3: Audio Ducking & Final Composition**
  - [ ] Integrate FFmpeg `sidechaincompress` in `concatenateScenes` for dynamic BGM volume ducking.
- [ ] **Phase 4: Verification & Single Deployment**
  - [ ] Build and test end-to-end locally.
  - [ ] Push single commit to production.
