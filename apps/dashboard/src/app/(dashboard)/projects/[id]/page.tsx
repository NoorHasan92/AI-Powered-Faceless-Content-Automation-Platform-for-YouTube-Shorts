// File Location: src/app/(dashboard)/projects/[id]/page.tsx
// Displays the redesigned SaaS Video Production Studio Workspace.

import { notFound } from "next/navigation";
import { getProjectWithPipeline } from "@/services/project.service";
import { generateScriptAction } from "@/actions/script.actions";
import { triggerExportAction } from "@/actions/export.actions";
import { archiveProjectAction, deleteProjectAction, discardProjectAction } from "@/actions/project.actions";
import { generateVoiceoverAction } from "@/actions/voiceover.actions";
import { generateSubtitlesAction } from "@/actions/subtitle.actions";
import { generateAssetsAction } from "@/actions/asset.actions";
import ProjectStudioWorkspace from "@/components/project/ProjectStudioWorkspace";

interface ProjectDetailsProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsProps) {
  const { id } = await params;
  const project = await getProjectWithPipeline(id);

  if (!project) {
    notFound();
  }

  // Pre-bind server actions
  const triggerScriptAgent = generateScriptAction.bind(
    null,
    project.id,
    project.niche,
    project.tone,
    project.targetDuration,
    project.specificTopic,
    project.creatorInstructions
  );
  const triggerVideoAgent = triggerExportAction.bind(null, project.id);
  const triggerVoiceoverAgent = generateVoiceoverAction.bind(null, project.id);
  const triggerAssetAgent = generateAssetsAction.bind(null, project.id);
  const triggerSubtitleAgent = generateSubtitlesAction.bind(null, project.id);
  const handleArchive = archiveProjectAction.bind(null, project.id);
  const handleDiscard = discardProjectAction.bind(null, project.id);
  const handleDelete = deleteProjectAction.bind(null, project.id);

  return (
    <ProjectStudioWorkspace
      project={project}
      triggerScriptAgent={triggerScriptAgent}
      triggerVoiceoverAgent={triggerVoiceoverAgent}
      triggerAssetAgent={triggerAssetAgent}
      triggerSubtitleAgent={triggerSubtitleAgent}
      triggerVideoAgent={triggerVideoAgent}
      archiveProjectAction={handleArchive}
      discardProjectAction={handleDiscard}
      deleteProjectAction={handleDelete}
    />
  );
}
