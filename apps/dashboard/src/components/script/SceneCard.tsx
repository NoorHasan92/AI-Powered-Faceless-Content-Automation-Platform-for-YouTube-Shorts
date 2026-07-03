// File Location: src/components/script/SceneCard.tsx
import type { Scene } from "@prisma/client";

interface SceneCardProps {
  scene: Scene;
}

export default function SceneCard({ scene }: SceneCardProps) {
  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-sm">
      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
        <span>SCENE {scene.sceneIndex + 1}</span>
        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
          {scene.duration}s
        </span>
      </div>
      
      <p className="text-slate-900 font-medium">
        🗣️ Narration: &quot;{scene.narrationText}&quot;
      </p>
      
      <p className="text-slate-600 bg-white p-2.5 rounded border border-slate-100 text-xs italic">
        🎬 Visual Prompt: {scene.visualPrompt}
      </p>

      {scene.searchKeywords && scene.searchKeywords.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-slate-400 mt-0.5">Keywords:</span>
          {scene.searchKeywords.map((kw, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-medium uppercase tracking-wider">
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
