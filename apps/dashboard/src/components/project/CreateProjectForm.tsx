"use client";

import { useState, useRef } from "react";
import {
  Smartphone,
  MonitorPlay,
  Sparkles,
  Music,
  Flame,
  Loader2,
  RefreshCw,
  TrendingUp,
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  Layers,
  Radio,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  { value: "15-30 Seconds (Short & Punchy)", label: "15–30s (Short & Punchy)" },
  { value: "30-50 Seconds (Standard)", label: "30–50s (Standard Short)" },
  { value: "55-60 Seconds (Full Length)", label: "55–60s (Full Length Short)" },
];

const LONG_FORM_DURATIONS = [
  { value: "3-5 Minutes (Explainer / Mini-Doc)", label: "3–5 Min (Mini-Doc / Explainer)" },
  { value: "5-8 Minutes (Deep Dive)", label: "5–8 Min (Deep Dive Documentary)" },
  { value: "8-10 Minutes (Full Documentary)", label: "8–10 Min (Full Investigative Doc)" },
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

const STEPS = [
  { id: 1, label: "Concept & Format", icon: Layers },
  { id: 2, label: "Story & Research", icon: Sliders },
  { id: 3, label: "Audio & Studio", icon: Radio },
];

export default function CreateProjectForm() {
  const [currentStep, setCurrentStep] = useState(1);
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
      {/* Hidden inputs always present for form submission */}
      <input type="hidden" name="videoFormat" value={videoFormat} />
      <input type="hidden" name="aspectRatio" value={videoFormat === "LONG_FORM" ? "16:9" : "9:16"} />
      <input type="hidden" name="voice" value={selectedVoice} />
      <input type="hidden" name="bgmTrack" value={selectedBgm} />

      {/* Stepper Navigation Bar */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              type="button"
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/60"
                  : isCompleted
                  ? "text-slate-700 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isCompleted
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? <CheckCircle2 size={12} /> : step.id}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Wizard Content with Animated Step Slides */}
      <AnimatePresence mode="wait">
        {/* STEP 1: CONCEPT & FORMAT */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Video Architecture Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                1. Select Video Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => handleFormatChange("SHORTS")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    videoFormat === "SHORTS"
                      ? "border-blue-500 bg-blue-50/60 shadow-sm ring-2 ring-blue-100"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      videoFormat === "SHORTS" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      YouTube Short
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        9:16 Vertical
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Fast-paced vertical short (15–60s) with rapid scene transitions for mobile feeds.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => handleFormatChange("LONG_FORM")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    videoFormat === "LONG_FORM"
                      ? "border-purple-500 bg-purple-50/60 shadow-sm ring-2 ring-purple-100"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      videoFormat === "LONG_FORM" ? "bg-purple-600 text-white shadow-xs" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <MonitorPlay size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                      Long-Form Video
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                        <Sparkles size={10} /> Deep Research
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        16:9 Landscape
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Multi-chapter cinematic documentary (3–10 min) with timeline research & chapter maps.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Title & Topic Seed */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  2. Project Working Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., The 1815 Eruption That Changed Global Climate"
                  className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-xs"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    3. Specific Topic / Seed <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={fetchTrendingTopics}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer"
                  >
                    <Flame size={13} className="animate-bounce" />
                    🔥 Live Trending Ideas
                  </button>
                </div>

                <input
                  type="text"
                  name="specificTopic"
                  value={specificTopic}
                  onChange={(e) => setSpecificTopic(e.target.value)}
                  placeholder='e.g., "The Year Without a Summer (1816)", "The Wow! Signal Mystery"'
                  className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-xs"
                />

                {/* Trending Topics Drawer */}
                {isTrendsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 bg-gradient-to-b from-orange-50/60 to-amber-50/40 border border-orange-200/90 rounded-2xl space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-orange-600" />
                        <span className="font-bold text-xs text-slate-900">
                          Live Trend Signals for &ldquo;{niche}&rdquo;
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={fetchTrendingTopics}
                          disabled={isLoadingTrends}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                          title="Refresh"
                        >
                          <RefreshCw size={13} className={isLoadingTrends ? "animate-spin" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsTrendsOpen(false)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {isLoadingTrends ? (
                      <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-2">
                        <Loader2 size={20} className="animate-spin text-orange-500" />
                        <span className="text-xs font-medium">Scanning YouTube & Google Trends...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {trendingTopics.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-white border border-orange-100 hover:border-orange-300 rounded-xl shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                                  🔥 {item.viralScore}% Buzz
                                </span>
                                <span className="text-[10px] text-slate-500">{item.targetDuration}</span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-1">
                                &ldquo;{item.hookAngle}&rdquo;
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[9px] text-slate-400">{item.source}</span>
                              <button
                                type="button"
                                onClick={() => applyTrend(item)}
                                className="px-2 py-1 text-[11px] font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors cursor-pointer"
                              >
                                Use Topic →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                Next: Story & Research <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: STORY & RESEARCH */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Content Niche
                </label>
                <select
                  name="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white shadow-xs font-medium"
                >
                  {NICHE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Narration Tone
                </label>
                <select
                  name="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white shadow-xs font-medium"
                >
                  {TONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Duration
                </label>
                <select
                  name="targetDuration"
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white shadow-xs font-medium"
                >
                  {(videoFormat === "SHORTS" ? SHORTS_DURATIONS : LONG_FORM_DURATIONS).map((dur) => (
                    <option key={dur.value} value={dur.value}>
                      {dur.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Research Subtopics & Chapters */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Subtopics & Chapters to Research <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                name="subtopics"
                rows={3}
                value={subtopics}
                onChange={(e) => setSubtopics(e.target.value)}
                placeholder={`e.g.,\n- The initial volcanic eruption and shockwaves\n- Global temperature drops and agricultural famine in 1816\n- Cultural aftershocks: Lord Byron, Mary Shelley and Frankenstein`}
                className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-xs resize-y"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                The Deep Research Engine investigates each angle against live YouTube search trends and verified records.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-5 rounded-xl transition-colors cursor-pointer text-sm"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer text-sm"
              >
                Next: Audio Studio <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: AUDIO & STUDIO */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Voice Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                1. Select Narrator Voice
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {VOICE_OPTIONS.map((voice) => {
                  const isSelected = selectedVoice === voice.id;
                  const isPlaying = playingVoice === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/60 shadow-xs ring-2 ring-blue-100"
                          : "border-slate-200/90 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full mb-1">
                        <span className={`font-bold text-sm ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                          {voice.label}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVoicePreview(voice.id);
                          }}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                            isPlaying
                              ? "bg-blue-600 text-white animate-pulse"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                          title="Preview"
                        >
                          {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      </div>
                      <span className={`text-[11px] ${isSelected ? "text-blue-700" : "text-slate-500"}`}>
                        {voice.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Background Music Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Music size={14} className="text-purple-600" />
                2. Royalty-Free Background Music (BGM)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {BGM_OPTIONS.map((bgm) => {
                  const isSelected = selectedBgm === bgm.id;
                  const isPlaying = playingBgm === bgm.id;

                  return (
                    <div
                      key={bgm.id}
                      onClick={() => setSelectedBgm(bgm.id)}
                      className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-purple-500 bg-purple-50/60 shadow-xs ring-2 ring-purple-100"
                          : "border-slate-200/90 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full mb-1">
                        <span className={`font-bold text-xs ${isSelected ? "text-purple-900" : "text-slate-800"}`}>
                          {bgm.label}
                        </span>
                        {bgm.file && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBgmPreview(bgm);
                            }}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                              isPlaying
                                ? "bg-purple-600 text-white animate-pulse"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                            title="Preview track"
                          >
                            {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                        )}
                      </div>
                      <span className={`text-[10px] leading-tight ${isSelected ? "text-purple-700" : "text-slate-500"}`}>
                        {bgm.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Director Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Director Notes & Pacing Instructions <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                name="creatorInstructions"
                rows={2}
                placeholder={`e.g.,\n"Maintain an ominous, investigative tone like Vox or Lemmino"\n"Do not use generic clickbait claims"`}
                className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-xs resize-y"
              />
            </div>

            {/* Navigation & Submit */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-5 rounded-xl transition-colors cursor-pointer text-sm"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <SubmitButton
                pendingText="Initializing AI Pipeline..."
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Sparkles size={18} /> Initialize Automated Pipeline
              </SubmitButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
