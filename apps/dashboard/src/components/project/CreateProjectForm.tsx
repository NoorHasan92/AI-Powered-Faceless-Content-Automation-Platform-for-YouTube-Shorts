"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Volume2,
  VolumeX,
  Smartphone,
  MonitorPlay,
  Sparkles,
  Music,
  Flame,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { createProjectAction } from "@/actions/project.actions";
import { NICHE_OPTIONS, TONE_OPTIONS } from "@/lib/constants";

const VOICE_OPTIONS = [
  { id: "en-US-AvaMultilingualNeural", label: "Female (Ava)", desc: "Clear & Classic" },
  { id: "en-US-BrianMultilingualNeural", label: "Male (Brian)", desc: "Deep & Professional" },
  { id: "en-US-EmmaMultilingualNeural", label: "Female (Emma)", desc: "Warm & Engaging" },
  { id: "en-US-AndrewMultilingualNeural", label: "Male (Andrew)", desc: "Standard & Energetic" },
];

const BGM_OPTIONS = [
  {
    id: "cinematic_documentary",
    label: "Cinematic Documentary",
    desc: "Harmonic warm ambient drone for science, history & explainers",
    file: "/bgm/cinematic_documentary.mp3",
  },
  {
    id: "investigative_mystery",
    label: "Investigative Mystery",
    desc: "Suspenseful atmospheric pads for mysteries & conspiracies",
    file: "/bgm/investigative_mystery.mp3",
  },
  {
    id: "dramatic_tension",
    label: "Dramatic Tension",
    desc: "Low-frequency cinematic pulse for high-stakes storytelling",
    file: "/bgm/dramatic_tension.mp3",
  },
  {
    id: "none",
    label: "None (Voiceover Only)",
    desc: "Pure vocal narration with zero background music",
    file: null,
  },
];

const SHORTS_DURATIONS = [
  { value: "15-30 Seconds (Short & Punchy)", label: "15–30 Seconds (Short & Punchy)" },
  { value: "30-50 Seconds (Standard)", label: "30–50 Seconds (Standard Short)" },
  { value: "55-60 Seconds (Full Length)", label: "55–60 Seconds (Full Length Short)" },
];

const LONG_FORM_DURATIONS = [
  { value: "3-5 Minutes (Explainer / Mini-Doc)", label: "3–5 Minutes (Explainer / Mini-Doc)" },
  { value: "5-8 Minutes (Deep Dive)", label: "5–8 Minutes (Deep Dive Documentary)" },
  { value: "8-10 Minutes (Full Documentary)", label: "8–10 Minutes (Full Investigative Documentary)" },
];

interface TrendingTopicItem {
  id: string;
  title: string;
  niche: string;
  tone: string;
  specificTopic: string;
  subtopics: string[];
  hookAngle: string;
  targetDuration: string;
  videoFormat: "SHORTS" | "LONG_FORM";
  viralScore: number;
  source: string;
}

export default function CreateProjectForm() {
  const [videoFormat, setVideoFormat] = useState<"SHORTS" | "LONG_FORM">("SHORTS");
  const [selectedDuration, setSelectedDuration] = useState(SHORTS_DURATIONS[1].value);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [selectedBgm, setSelectedBgm] = useState(BGM_OPTIONS[0].id);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [playingBgm, setPlayingBgm] = useState<string | null>(null);

  // Form field state for trend auto-fill
  const [title, setTitle] = useState("");
  const [niche, setNiche] = useState<string>(NICHE_OPTIONS[0].value);
  const [tone, setTone] = useState<string>(TONE_OPTIONS[0].value);
  const [specificTopic, setSpecificTopic] = useState("");
  const [subtopics, setSubtopics] = useState("");

  // Trending Radar state
  const [isTrendsOpen, setIsTrendsOpen] = useState(false);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopicItem[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFormatChange = (format: "SHORTS" | "LONG_FORM") => {
    setVideoFormat(format);
    if (format === "SHORTS") {
      setSelectedDuration(SHORTS_DURATIONS[1].value);
    } else {
      setSelectedDuration(LONG_FORM_DURATIONS[0].value);
    }
  };

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoice(null);
    setPlayingBgm(null);
  };

  const toggleVoicePreview = (voiceId: string) => {
    if (playingVoice === voiceId) {
      stopAllAudio();
    } else {
      stopAllAudio();
      const newAudio = new Audio(`/api/tts/demo?voice=${voiceId}`);
      newAudio.onended = () => setPlayingVoice(null);
      newAudio.onerror = () => setPlayingVoice(null);
      newAudio.play().catch((e) => {
        if (e.name !== "AbortError") console.error("Audio playback failed", e);
      });
      audioRef.current = newAudio;
      setPlayingVoice(voiceId);
    }
  };

  const toggleBgmPreview = (bgm: typeof BGM_OPTIONS[number]) => {
    if (!bgm.file) return;
    if (playingBgm === bgm.id) {
      stopAllAudio();
    } else {
      stopAllAudio();
      const newAudio = new Audio(bgm.file);
      newAudio.volume = 0.35;
      newAudio.onended = () => setPlayingBgm(null);
      newAudio.onerror = () => setPlayingBgm(null);
      newAudio.play().catch((e) => {
        if (e.name !== "AbortError") console.error("BGM playback failed", e);
      });
      audioRef.current = newAudio;
      setPlayingBgm(bgm.id);
    }
  };

  const fetchTrendingTopics = async () => {
    setIsTrendsOpen(true);
    setIsLoadingTrends(true);
    try {
      const res = await fetch(`/api/trends?niche=${encodeURIComponent(niche)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTrendingTopics(data.data);
      }
    } catch (err) {
      console.error("Failed to load trending topics:", err);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const applyTrend = (trend: TrendingTopicItem) => {
    setTitle(trend.title);
    setSpecificTopic(trend.specificTopic);
    setSubtopics(trend.subtopics.map((s) => `- ${s}`).join("\n"));
    if (trend.tone) setTone(trend.tone);
    if (trend.videoFormat) {
      handleFormatChange(trend.videoFormat);
    }
    if (trend.targetDuration) {
      const matchedDur = (trend.videoFormat === "LONG_FORM" ? LONG_FORM_DURATIONS : SHORTS_DURATIONS).find(
        (d) => d.value.toLowerCase().includes(trend.targetDuration.toLowerCase().slice(0, 3))
      );
      if (matchedDur) setSelectedDuration(matchedDur.value);
    }
    setIsTrendsOpen(false);
  };

  return (
    <form action={createProjectAction} className="space-y-6">
      {/* Hidden inputs */}
      <input type="hidden" name="videoFormat" value={videoFormat} />
      <input type="hidden" name="aspectRatio" value={videoFormat === "LONG_FORM" ? "16:9" : "9:16"} />
      <input type="hidden" name="bgmTrack" value={selectedBgm} />

      {/* Video Format Selector Cards */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Video Format & Architecture
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => handleFormatChange("SHORTS")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
              videoFormat === "SHORTS"
                ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-100 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${videoFormat === "SHORTS" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <Smartphone size={22} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                YouTube Short
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">9:16 Vertical</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fast-paced viral vertical video (15–60s) optimized for mobile feeds and quick retention.
              </p>
            </div>
          </div>

          <div
            onClick={() => handleFormatChange("LONG_FORM")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
              videoFormat === "LONG_FORM"
                ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-100 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${videoFormat === "LONG_FORM" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <MonitorPlay size={22} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                Long-Form Video
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                  <Sparkles size={10} /> Deep Research
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">16:9 Landscape</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Multi-chapter documentary (3–10 min) with automated YouTube trend intelligence and factual timeline research.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Row: Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Project Working Title
          </label>
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., The 1815 Eruption That Changed Global Climate"
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm transition-shadow"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Content Niche
          </label>
          <select
            name="niche"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white shadow-sm transition-shadow"
          >
            {NICHE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Narration Tone
          </label>
          <select
            name="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white shadow-sm transition-shadow"
          >
            {TONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Target Duration
          </label>
          <select
            name="targetDuration"
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white shadow-sm transition-shadow"
          >
            {(videoFormat === "SHORTS" ? SHORTS_DURATIONS : LONG_FORM_DURATIONS).map((dur) => (
              <option key={dur.value} value={dur.value}>
                {dur.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1.5">
            {videoFormat === "LONG_FORM"
              ? "Long-form pacing adheres to ~2.3 words/sec TTS speaking rate across structured chapters with cinematic transitions."
              : "Shorts pacing requires rapid visual cuts every 4–6 seconds to sustain viewer retention."}
          </p>
        </div>
      </div>

      {/* Advanced Scripting Controls & Trending Radar */}
      <div className="pt-2 border-t border-slate-100 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Specific Topic / Seed <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <button
              type="button"
              onClick={fetchTrendingTopics}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer"
            >
              <Flame size={14} className="animate-bounce" />
              Hot & Trending Ideas
            </button>
          </div>

          <input
            type="text"
            name="specificTopic"
            value={specificTopic}
            onChange={(e) => setSpecificTopic(e.target.value)}
            placeholder='e.g., "The Year Without a Summer (1816)", "Why smartphones destroy focus", "The Wow! Signal"'
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm transition-shadow"
          />
          <p className="text-xs text-slate-500 mt-2">
            Leave blank to let the AI discover a compelling topic, or click <strong>Hot & Trending Ideas</strong> to autofill research-backed viral hooks.
          </p>

          {/* Trending Topics Drawer */}
          {isTrendsOpen && (
            <div className="mt-3 p-4 bg-gradient-to-b from-orange-50/50 to-amber-50/30 border border-orange-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-orange-600" />
                  <span className="font-semibold text-sm text-slate-900">
                    Live Trending Radar for &ldquo;{niche}&rdquo;
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchTrendingTopics}
                    disabled={isLoadingTrends}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
                    title="Refresh trends"
                  >
                    <RefreshCw size={14} className={isLoadingTrends ? "animate-spin" : ""} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTrendsOpen(false)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              {isLoadingTrends ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-2">
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                  <span className="text-xs font-medium">Scanning YouTube & Google Trends search intelligence...</span>
                </div>
              ) : trendingTopics.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No trending topics found. Click refresh to query again.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {trendingTopics.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white border border-orange-100 hover:border-orange-300 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                            🔥 {item.viralScore}% Viral Buzz
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {item.targetDuration}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">
                          &ldquo;{item.hookAngle}&rdquo;
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {item.source}
                        </span>
                        <button
                          type="button"
                          onClick={() => applyTrend(item)}
                          className="px-2.5 py-1 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Use This Topic →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subtopics / Deep Dive Angles for Research */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Subtopics & Chapters to Research <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            name="subtopics"
            rows={3}
            value={subtopics}
            onChange={(e) => setSubtopics(e.target.value)}
            placeholder={`e.g.,\n- The initial volcanic eruption and shockwaves\n- Global temperature drops and agricultural famine in 1816\n- Cultural aftershocks: Lord Byron, Mary Shelley and Frankenstein`}
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm transition-shadow resize-y"
          />
          <p className="text-xs text-slate-500 mt-2">
            The Deep Research Engine investigates each angle against live YouTube search trends and verified historical/scientific records.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Additional Instructions / Creator Notes <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            name="creatorInstructions"
            rows={3}
            placeholder={`e.g.,\n"Maintain an ominous, investigative tone like Vox or Lemmino"\n"Do not use generic clickbait claims"\n"Weave real dates and primary quotes into the narration"`}
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm transition-shadow resize-y"
          />
          <p className="text-xs text-slate-500 mt-2">
            High-priority director notes that steer the AI&apos;s pacing, tone, and editorial boundaries.
          </p>
        </div>
      </div>

      {/* Voice Selection Cards */}
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Narrator Voice
        </label>
        
        <input type="hidden" name="voice" value={selectedVoice} />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VOICE_OPTIONS.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            const isPlaying = playingVoice === voice.id;
            
            return (
              <div 
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-start ${
                  isSelected 
                    ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-100" 
                    : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start w-full mb-2">
                  <div className={`font-semibold ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                    {voice.label}
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVoicePreview(voice.id);
                    }}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      isPlaying 
                        ? "bg-blue-600 text-white animate-pulse" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    }`}
                    title="Play Audio Sample"
                  >
                    {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
                
                <span className={`text-xs ${isSelected ? "text-blue-700" : "text-slate-500"}`}>
                  {voice.desc}
                </span>
                
                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity ${
                  isSelected ? "bg-blue-600 text-white opacity-100" : "opacity-0"
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Royalty-Free Background Music (BGM) Cards */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Music size={16} className="text-purple-600" />
              Royalty-Free Background Music (BGM)
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically mixed continuously at 12% ducked volume under the voiceover with smooth fade-outs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BGM_OPTIONS.map((bgm) => {
            const isSelected = selectedBgm === bgm.id;
            const isPlaying = playingBgm === bgm.id;

            return (
              <div
                key={bgm.id}
                onClick={() => setSelectedBgm(bgm.id)}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-start ${
                  isSelected
                    ? "border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-100"
                    : "border-slate-200 bg-white hover:border-purple-300 hover:shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start w-full mb-2">
                  <div className={`font-semibold text-sm ${isSelected ? "text-purple-900" : "text-slate-800"}`}>
                    {bgm.label}
                  </div>

                  {bgm.file && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBgmPreview(bgm);
                      }}
                      className={`p-2 rounded-full transition-colors cursor-pointer ${
                        isPlaying
                          ? "bg-purple-600 text-white animate-pulse"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      }`}
                      title="Preview BGM track"
                    >
                      {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  )}
                </div>

                <span className={`text-xs ${isSelected ? "text-purple-700" : "text-slate-500"}`}>
                  {bgm.desc}
                </span>

                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity ${
                  isSelected ? "bg-purple-600 text-white opacity-100" : "opacity-0"
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <SubmitButton
          pendingText="Initializing Pipeline..."
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={18} /> Initialize Automated Pipeline
        </SubmitButton>
      </div>
    </form>
  );
}
