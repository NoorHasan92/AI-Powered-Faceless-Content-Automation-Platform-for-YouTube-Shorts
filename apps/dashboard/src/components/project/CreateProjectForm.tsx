"use client";

import { useState, useRef } from "react";
import { Plus, Volume2, VolumeX, Smartphone, MonitorPlay, Sparkles } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { createProjectAction } from "@/actions/project.actions";
import { NICHE_OPTIONS, TONE_OPTIONS } from "@/lib/constants";

const VOICE_OPTIONS = [
  { id: "en-US-AvaMultilingualNeural", label: "Female (Ava)", desc: "Clear & Classic" },
  { id: "en-US-BrianMultilingualNeural", label: "Male (Brian)", desc: "Deep & Professional" },
  { id: "en-US-EmmaMultilingualNeural", label: "Female (Emma)", desc: "Warm & Engaging" },
  { id: "en-US-AndrewMultilingualNeural", label: "Male (Andrew)", desc: "Standard & Energetic" },
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

export default function CreateProjectForm() {
  const [videoFormat, setVideoFormat] = useState<"SHORTS" | "LONG_FORM">("SHORTS");
  const [selectedDuration, setSelectedDuration] = useState(SHORTS_DURATIONS[1].value);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFormatChange = (format: "SHORTS" | "LONG_FORM") => {
    setVideoFormat(format);
    if (format === "SHORTS") {
      setSelectedDuration(SHORTS_DURATIONS[1].value);
    } else {
      setSelectedDuration(LONG_FORM_DURATIONS[0].value);
    }
  };

  const togglePreview = (voiceId: string) => {
    if (playingVoice === voiceId) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoice(null);
    } else {
      // Play new voice
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const newAudio = new Audio(`/api/tts/demo?voice=${voiceId}`);
      newAudio.onended = () => setPlayingVoice(null);
      newAudio.onerror = () => setPlayingVoice(null);
      newAudio.play().catch(e => {
        if (e.name !== "AbortError") {
          console.error("Audio playback failed", e);
        }
      });
      
      audioRef.current = newAudio;
      setPlayingVoice(voiceId);
    }
  };

  return (
    <form action={createProjectAction} className="space-y-6">
      
      {/* Hidden inputs to pass format and aspect ratio */}
      <input type="hidden" name="videoFormat" value={videoFormat} />
      <input type="hidden" name="aspectRatio" value={videoFormat === "LONG_FORM" ? "16:9" : "9:16"} />

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
              <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
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

      {/* Advanced Scripting Controls */}
      <div className="pt-2 border-t border-slate-100 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Specific Topic / Seed <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            name="specificTopic"
            placeholder='e.g., "The Year Without a Summer (1816)", "Why smartphones destroy focus", "The Doorway Effect"'
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm transition-shadow"
          />
          <p className="text-xs text-slate-500 mt-2">
            Leave blank to let the AI discover a compelling viral topic from your niche. If provided, deep research and scripting lock directly onto this seed.
          </p>
        </div>

        {/* Subtopics / Deep Dive Angles for Research */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Subtopics & Chapters to Research <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            name="subtopics"
            rows={3}
            placeholder={`e.g.,\n- The initial volcanic eruption and shockwaves\n- Global temperature drops and agricultural famine in 1816\n- Cultural aftershocks: Lord Byron, Mary Shelley and the creation of Frankenstein`}
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
            rows={4}
            placeholder={`e.g.,\n"Maintain an ominous, investigative tone like Vox or Lemmino"\n"Do not use generic clickbait claims"\n"Weave real dates and primary quotes into the narration"`}
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm transition-shadow resize-y"
          />
          <p className="text-xs text-slate-500 mt-2">
            High-priority director notes that steer the AI's pacing, tone, and editorial boundaries.
          </p>
        </div>
      </div>

      {/* Voice Selection Cards */}
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Narrator Voice
        </label>
        
        {/* Hidden input to pass selected voice to Server Action */}
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
                  
                  {/* Speaker Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent selecting card if just playing audio
                      togglePreview(voice.id);
                    }}
                    className={`p-2 rounded-full transition-colors ${
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
                
                {/* Checkmark circle */}
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

      <div className="flex justify-end pt-4">
        <SubmitButton
          pendingText="Initializing Pipeline..."
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Initialize Automated Pipeline
        </SubmitButton>
      </div>
    </form>
  );
}
