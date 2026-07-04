"use client";

import { useState } from "react";
import { setYouTubeVisibilityAction } from "@/actions/youtube.actions";
import { Loader2, Lock, Link as LinkIcon, Globe } from "lucide-react";

interface VisibilitySelectProps {
  initialVisibility: "public" | "private" | "unlisted";
}

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: Lock },
  { value: "unlisted", label: "Unlisted", icon: LinkIcon },
  { value: "public", label: "Public", icon: Globe },
] as const;

export default function VisibilitySelect({ initialVisibility }: VisibilitySelectProps) {
  const [isPending, setIsPending] = useState(false);
  const [visibility, setVisibility] = useState(initialVisibility);

  const handleSelect = async (newVal: "public" | "private" | "unlisted") => {
    if (newVal === visibility || isPending) return;
    
    setVisibility(newVal);
    setIsPending(true);
    try {
      await setYouTubeVisibilityAction(newVal);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center bg-slate-100/70 p-1 rounded-lg border border-slate-200/60 shadow-sm relative">
        {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = visibility === value;
          return (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              disabled={isPending}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                ${isActive 
                  ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }
                ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <Icon size={14} className={isActive ? "text-blue-600" : "text-slate-400"} />
              {label}
            </button>
          );
        })}
      </div>
      
      {/* Loading Spinner Area */}
      <div className="w-5 flex justify-center">
        {isPending && <Loader2 size={16} className="animate-spin text-slate-400" />}
      </div>
    </div>
  );
}
