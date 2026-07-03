// File Location: src/components/asset/AssetPanel.tsx
// UI panel for visual asset generation status per scene.

import { ImageIcon, CheckCircle2, AlertCircle, RefreshCw, VideoIcon } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Scene, Asset } from "@prisma/client";

interface SceneWithAssets extends Scene {
  assets: Asset[];
}

interface AssetPanelProps {
  status: string;
  scenes: SceneWithAssets[];
  onGenerateAction: (payload: FormData) => void;
}

export default function AssetPanel({ status, scenes, onGenerateAction }: AssetPanelProps) {
  const hasAssets = scenes.some(s => s.assets.length > 0);
  const isReady = status === "SCRIPT_READY" || status === "IN_PRODUCTION" || status === "EXPORT_QUEUED";
  const canGenerate = scenes.length > 0 && isReady;

  return (
    <SectionCard title="Visual Assets" icon={ImageIcon} iconColor="text-emerald-500">
      {!hasAssets ? (
        <div className="py-4 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            {canGenerate
              ? "Ready to fetch stock videos & images from Pexels for each scene."
              : "Complete the script phase to unlock asset generation."}
          </p>

          {canGenerate && (
            <form action={onGenerateAction}>
              <SubmitButton
                pendingText="Fetching Assets..."
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm"
              >
                <RefreshCw size={16} /> Generate Visual Assets
              </SubmitButton>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-slate-500">Source: Pexels Stock</span>
            <form action={onGenerateAction}>
              <SubmitButton
                pendingText="Regenerating..."
                className="text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded"
              >
                Regenerate All
              </SubmitButton>
            </form>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {scenes.sort((a, b) => a.sceneIndex - b.sceneIndex).map(scene => {
              const asset = scene.assets[0];
              return (
                <div key={scene.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">Scene {scene.sceneIndex + 1}</span>
                    {asset && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">
                        {asset.type === "STOCK_VIDEO" ? "Video" : "Image"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {asset ? (
                      asset.status === "COMPLETED" ? (
                        <>
                          {asset.type === "STOCK_VIDEO" 
                            ? <VideoIcon size={14} className="text-emerald-500" />
                            : <ImageIcon size={14} className="text-emerald-500" />
                          }
                          <CheckCircle2 size={16} className="text-green-500" />
                        </>
                      ) : (
                        <AlertCircle size={16} className="text-red-500" />
                      )
                    ) : (
                      <AlertCircle size={16} className="text-amber-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
