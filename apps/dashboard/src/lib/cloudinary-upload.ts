// apps/dashboard/src/lib/cloudinary-upload.ts
// Central Cloudinary upload/delete helpers for the pipeline.
// All generated artifacts (audio, assets, exports) route through here.

import { cloudinary } from "@/lib/cloudinary";

// ---------------------------------------------------------------------------
// Exports (existing)
// ---------------------------------------------------------------------------

export async function uploadVideoToCloudinary(
    filePath: string,
    projectId: string
) {
    return cloudinary.uploader.upload(filePath, {
        resource_type: "video",
        folder: `tars/projects/${projectId}/exports`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
    });
}

// ---------------------------------------------------------------------------
// Voiceover audio
// ---------------------------------------------------------------------------

export async function uploadAudioToCloudinary(
    filePath: string,
    projectId: string,
    sceneIndex: number
) {
    return cloudinary.uploader.upload(filePath, {
        resource_type: "video", // Cloudinary treats audio under the "video" resource type
        folder: `tars/projects/${projectId}/audio`,
        public_id: `scene-${sceneIndex}`,
        overwrite: true,
    });
}

// ---------------------------------------------------------------------------
// Scene assets (images & videos)
// ---------------------------------------------------------------------------

type AssetType = "STOCK_VIDEO" | "STOCK_IMAGE" | "AI_IMAGE" | "INFOGRAPHIC";

export async function uploadAssetToCloudinary(
    filePath: string,
    projectId: string,
    sceneIndex: number,
    assetType: AssetType
) {
    const resourceType: "video" | "image" =
        assetType === "STOCK_VIDEO" ? "video" : "image";

    return cloudinary.uploader.upload(filePath, {
        resource_type: resourceType,
        folder: `tars/projects/${projectId}/assets`,
        public_id: `scene-${sceneIndex}`,
        overwrite: true,
    });
}

// ---------------------------------------------------------------------------
// Project cleanup — delete all Cloudinary resources for a project
// ---------------------------------------------------------------------------

/**
 * Best-effort deletion of all Cloudinary resources under a project's folders.
 * Deletes both image and video resource types from audio/, assets/, and exports/.
 * Does NOT throw on partial failures — logs them instead.
 */
export async function deleteProjectCloudinaryAssets(
    projectId: string
): Promise<void> {
    const folders = [
        `tars/projects/${projectId}/audio`,
        `tars/projects/${projectId}/assets`,
        `tars/projects/${projectId}/exports`,
    ];

    const resourceTypes: ("image" | "video")[] = ["image", "video"];

    for (const folder of folders) {
        for (const resourceType of resourceTypes) {
            try {
                await cloudinary.api.delete_resources_by_prefix(folder, {
                    resource_type: resourceType,
                });
            } catch (err: any) {
                // Cloudinary returns 404 when prefix has no resources — that's fine.
                // Log anything else for debugging but don't block the delete flow.
                const status = err?.http_code || err?.error?.http_code;
                if (status !== 404) {
                    console.warn(
                        `[Cloudinary cleanup] Failed to delete ${resourceType} resources in "${folder}":`,
                        err?.message || err
                    );
                }
            }
        }

        // Attempt to remove the now-empty folder (best-effort)
        try {
            await cloudinary.api.delete_folder(folder);
        } catch {
            // Folder may not exist or may not be empty — ignore
        }
    }

    // Try removing the project-level folder too
    try {
        await cloudinary.api.delete_folder(`tars/projects/${projectId}`);
    } catch {
        // Ignore — may still have subfolders from other resources
    }
}