import { db, generationJobsTable } from "@workspace/db";
import type { JobType, ImageJobPayload, VideoJobPayload, RenderJobPayload } from "./job-types";

export async function enqueueJob(
  jobType: JobType,
  payload: ImageJobPayload | VideoJobPayload | RenderJobPayload,
  options?: { maxRetries?: number }
) {
  const projectId = payload.projectId;
  const shotId = "shotId" in payload ? payload.shotId : null;

  const [job] = await db.insert(generationJobsTable).values({
    projectId,
    shotId,
    jobType,
    provider: jobType === "image" ? "comfyui" : jobType === "video" ? "wan2-comfyui" : "ffmpeg",
    requestJson: payload,
    status: "pending",
    maxRetries: options?.maxRetries ?? 1,
    retryCount: 0,
  }).returning();

  return job;
}

export async function enqueueImageJob(payload: ImageJobPayload, options?: { maxRetries?: number }) {
  return enqueueJob("image", payload, options);
}

export async function enqueueVideoJob(payload: VideoJobPayload, options?: { maxRetries?: number }) {
  return enqueueJob("video", payload, options);
}

export async function enqueueRenderJob(payload: RenderJobPayload) {
  return enqueueJob("render", payload, { maxRetries: 0 });
}
