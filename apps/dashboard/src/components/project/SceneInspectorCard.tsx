// File Location: src/components/project/SceneInspectorCard.tsx
import type { Scene, Asset } from "@prisma/client";
import { CheckCircle2, XCircle } from "lucide-react";

interface SceneWithAssets extends Scene {
  assets: Asset[];
}

interface SceneInspectorCardProps {
  scene: SceneWithAssets;
}

export default function SceneInspectorCard({ scene }: SceneInspectorCardProps) {
  const asset = scene.assets && scene.assets.length > 0 ? scene.assets[0] : null;
  const assetSearches = scene.assetSearches as Array<{ query: string; type: string; purpose: string }> | null;

  return (
    <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-slate-800">Scene {scene.sceneIndex + 1}</span>
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">
          {scene.duration}s
        </span>
      </div>

      {/* Scripting Layer */}
      <details className="group border-t border-slate-100 pt-3" open>
        <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 hover:text-slate-700 transition-colors">
          <span>Scripting</span>
          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="space-y-2 mt-2">
          <p className="text-sm text-slate-800"><span className="font-medium text-slate-500">Narration:</span> &quot;{scene.narrationText}&quot;</p>
          {scene.onScreenCaption && (
            <p className="text-sm text-slate-800"><span className="font-medium text-slate-500">Caption:</span> {scene.onScreenCaption}</p>
          )}
        </div>
      </details>

      {/* AI Asset Planning Layer */}
      <details className="group border-t border-slate-100 pt-3">
        <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 hover:text-slate-700 transition-colors">
          <span>AI Asset Planning</span>
          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="space-y-3 mt-2">
          {scene.visualRole && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-500">Visual Role:</span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[11px] font-bold tracking-wide uppercase border border-amber-200">
                {scene.visualRole}
              </span>
            </div>
          )}

          {scene.endingIntent && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-500">Ending Intent:</span>
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-bold tracking-wide uppercase border border-purple-200">
                {scene.endingIntent}
              </span>
            </div>
          )}
          
          {scene.searchKeywords && scene.searchKeywords.length > 0 && (
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-xs text-slate-500">Light Tags:</span>
              {scene.searchKeywords.map((kw, i) => (
                <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[11px] font-medium tracking-wide">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {assetSearches && assetSearches.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-slate-500">Structured Search Plan:</span>
              <div className="flex flex-col gap-1.5">
                {assetSearches.map((search, i) => {
                  const isSelected = asset && asset.searchQuery === search.query;
                  return (
                    <div 
                      key={i} 
                      className={`text-xs p-2 rounded border flex items-center justify-between ${
                        isSelected ? "bg-green-50 border-green-200 text-green-800" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && <CheckCircle2 size={14} className="text-green-600" />}
                        <span className="font-semibold uppercase text-[10px] bg-white px-1.5 py-0.5 rounded border shadow-sm shrink-0">
                          {search.type} | {search.purpose}
                        </span>
                        <span className="truncate">{search.query}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </details>

      {/* Actual Asset Selected */}
      <details className="group border-t border-slate-100 pt-3" open>
        <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 hover:text-slate-700 transition-colors">
          <span>Final Asset Selected</span>
          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-2">
          {asset ? (
            <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {asset.type === "STOCK_IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.sourceUrl} alt="Asset" className="w-16 h-24 object-cover rounded shadow-sm bg-slate-200 shrink-0" />
              ) : (
                <div className="w-16 h-24 bg-slate-800 flex items-center justify-center rounded shadow-sm shrink-0">
                  <span className="text-white text-[10px] uppercase font-bold">Video</span>
                </div>
              )}
              <div className="text-xs text-slate-600 space-y-1 min-w-0">
                <p><span className="font-semibold text-slate-800">Status:</span> {asset.status}</p>
                <p><span className="font-semibold text-slate-800">Type:</span> {asset.type}</p>
                <p className="truncate"><span className="font-semibold text-slate-800">Query:</span> {asset.searchQuery || "N/A"}</p>
                <p className="truncate" title={asset.sourceUrl}><span className="font-semibold text-slate-800">Source:</span> <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Link</a></p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic p-3 bg-slate-50 border rounded text-center">
              No asset generated yet.
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
