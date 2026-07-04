"use client";

import { useState, useRef } from "react";
import { Plus, Volume2, VolumeX } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { createProjectAction } from "@/actions/project.actions";
import { NICHE_OPTIONS, TONE_OPTIONS } from "@/lib/constants";

const VOICE_OPTIONS = [
  { id: "en-US-AvaMultilingualNeural", label: "Female (Ava)", desc: "Clear & Classic" },
  { id: "en-US-BrianMultilingualNeural", label: "Male (Brian)", desc: "Deep & Professional" },
  { id: "en-US-EmmaMultilingualNeural", label: "Female (Emma)", desc: "Warm & Engaging" },
  { id: "en-US-AndrewMultilingualNeural", label: "Male (Andrew)", desc: "Standard & Energetic" },
];

export default function CreateProjectForm() {
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = (voiceId: string) => {
    if (playingVoice === voiceId) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      // Play new voice
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const newAudio = new Audio(`/api/tts/demo?voice=${voiceId}`);
      newAudio.onended = () => setPlayingVoice(null);
      newAudio.play().catch(e => console.error("Audio playback failed", e));
      
      audioRef.current = newAudio;
      setPlayingVoice(voiceId);
    }
  };

  return (
    <form action={createProjectAction} className="space-y-6">
      
      {/* Top Row: Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Project Working Title
          </label>
          <input
            type="text"
            name="title"
            placeholder="e.g., Quantum Physics Explained"
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
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white shadow-sm transition-shadow"
          >
            <option value="15-30 Seconds (Short & Punchy)">15-30 Seconds (Short & Punchy)</option>
            <option value="30-50 Seconds (Standard)">30-50 Seconds (Standard)</option>
            <option value="55-60 Seconds (Full Length)">60 Seconds (Full Length)</option>
          </select>
        </div>
      </div>

      {/* Advanced Scripting Controls */}
      <div className="pt-2 border-t border-slate-100 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Specific Topic / Topic Seed <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            name="specificTopic"
            placeholder='e.g., "Why smartphones destroy focus", "The Doorway Effect", "Why gold comes from exploding stars"'
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm transition-shadow"
          />
          <p className="text-xs text-slate-500 mt-2">
            Leave blank to let the AI pick a random topic from your niche. If provided, the script will focus exactly on this seed.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Additional Instructions / Creator Notes <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            name="creatorInstructions"
            rows={3}
            placeholder={`e.g.,\n"Focus on students and smartphone addiction"\n"Keep it more scientific than clickbait"\n"End with a reflective payoff instead of a generic CTA"\n"Avoid overused examples and use a fresh angle"`}
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm transition-shadow resize-y"
          />
          <p className="text-xs text-slate-500 mt-2">
            Use this to steer the AI's originality, examples, pacing, and ending style. These act as high-priority director notes.
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
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} /> Initialize Automated Pipeline
        </SubmitButton>
      </div>
    </form>
  );
}
