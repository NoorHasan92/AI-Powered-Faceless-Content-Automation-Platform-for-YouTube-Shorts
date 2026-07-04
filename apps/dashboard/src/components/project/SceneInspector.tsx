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

  return (
    <SectionCard title="Scene Inspector (Debug)" icon={Search} iconColor="text-indigo-500">
      <div className="space-y-4">
        {sortedScenes.map((scene) => (
          <SceneInspectorCard key={scene.id} scene={scene} />
        ))}
      </div>
    </SectionCard>
  );
}
