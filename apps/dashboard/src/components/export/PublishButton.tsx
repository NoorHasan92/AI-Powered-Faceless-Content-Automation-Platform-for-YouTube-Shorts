// File Location: src/components/export/PublishButton.tsx
"use client";

import { useTransition } from "react";
import { UploadCloud, Loader2, CheckCircle2 } from "lucide-react";
import { publishToYouTubeAction } from "@/actions/youtube.actions";

interface PublishButtonProps {
  exportJobId: string;
  projectId: string;
}

export default function PublishButton({ exportJobId, projectId }: PublishButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handlePublish = () => {
    startTransition(async () => {
      const result = await publishToYouTubeAction(exportJobId, projectId);
      if (!result.success) {
        alert(result.error);
      } else {
        alert("Video successfully published to YouTube (Private)!");
      }
    });
  };

  return (
    <button
      onClick={handlePublish}
      disabled={isPending}
      className="flex-1 flex justify-center items-center gap-1 bg-white border border-red-300 text-red-700 hover:bg-red-50 font-medium py-1.5 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <UploadCloud size={14} />
      )}
      {isPending ? "Publishing..." : "Publish to YouTube"}
    </button>
  );
}
