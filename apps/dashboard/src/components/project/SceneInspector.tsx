// File Location: src/components/project/SceneInspector.tsx
import { Search } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SceneInspectorCard from "./SceneInspectorCard";
import type { Scene, Asset } from "@prisma/client";

interface SceneWithAssets extends Scene {
  assets: Asset[];
}

interface SceneInspectorProps {
  scenes: SceneWithAssets[];
}

export default function SceneInspector({ scenes }: SceneInspectorProps) {
  if (!scenes || scenes.length === 0) return null;

  const sortedScenes = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);
  
  let hardMotionScenes = 0;
  let softMotionScenes = 0;
  let aiHeroScenes = 0;
  let aiDisabled = false;

  scenes.forEach(s => {
      const finalType = s.assets?.[0]?.type || s.visualSource;
      if (finalType === "STOCK_VIDEO" || (s as any).motionTreatment === "INFOGRAPHIC_MOTION") {
          hardMotionScenes++;
      } else if (finalType === "AI_IMAGE" && (s as any).motionTreatment === "KEN_BURNS") {
          softMotionScenes++;
      }
      
      if (finalType === "AI_IMAGE") {
          aiHeroScenes++;
      }
      
      if ((s as any).routingDowngradeReason === "AI_DISABLED_FOR_PROJECT" || (s as any).routingDowngradeReason === "REPLICATE_402") {
          aiDisabled = true;
      }
  });

  const totalScenes = scenes.length;

  return (
    <SectionCard title="Scene Inspector (Debug)" icon={Search} iconColor="text-indigo-500">
      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-4">
          <div className="space-y-1">
              <span className="text-xs text-slate-500 uppercase font-bold block">Motion Coverage</span>
              <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-800">{hardMotionScenes} / {totalScenes}</span>
                  <span className="text-xs text-slate-500">scenes</span>
              </div>
              <span className="text-[10px] text-slate-400">Hard motion. (+{softMotionScenes} soft motion)</span>
          </div>
          <div className="w-px bg-slate-200"></div>
          <div className="space-y-1">
              <span className="text-xs text-slate-500 uppercase font-bold block">AI Hero Scenes</span>
              <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-800">{aiHeroScenes}</span>
              </div>
          </div>
          {aiDisabled && (
              <>
                  <div className="w-px bg-slate-200"></div>
                  <div className="space-y-1 flex items-center">
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-bold uppercase border border-red-200">
                          AI Fallback Disabled (Credits)
                      </span>
                  </div>
              </>
          )}
      </div>

      <div className="space-y-4">
        {sortedScenes.map((scene) => (
          <SceneInspectorCard key={scene.id} scene={scene} />
        ))}
      </div>
    </SectionCard>
  );
}
