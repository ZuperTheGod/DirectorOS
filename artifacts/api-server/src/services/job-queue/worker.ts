import { eq, asc, and, sql } from "drizzle-orm";
import {
  db,
  generationJobsTable,
  shotsTable,
  assetsTable,
  storyboardFramesTable,
  scenesTable,
  projectsTable,
} from "@workspace/db";
import { generateImage } from "../connectors/image-connector";
import { generateVideo } from "../connectors/video-connector";
import { renderTimeline, type TimelineClip as RenderClip } from "../connectors/render-connector";
import { evaluateAsset } from "../evaluation/evaluator";
import type { ImageJobPayload, VideoJobPayload, RenderJobPayload } from "./job-types";
import * as fs from "fs";
import * as path from "path";

const ASSETS_DIR = path.join(process.cwd(), "..", "director-os", "public", "generated");
const EXPORTS_DIR = path.join(process.cwd(), "..", "director-os", "public", "exports");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let isRunning = false;
let isProcessing = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startWorker(intervalMs = 2000) {
  if (isRunning) return;
  isRunning = true;
  console.log(`[JobWorker] Started (polling every ${intervalMs}ms)`);

  pollInterval = setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      await processNextJob();
    } catch (err) {
      console.error("[JobWorker] Poll error:", err);
    } finally {
      isProcessing = false;
    }
  }, intervalMs);
}

export function stopWorker() {
  isRunning = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  console.log("[JobWorker] Stopped");
}

async function processNextJob() {
  const claimed = await db.update(generationJobsTable).set({
    status: "processing",
    updatedAt: new Date(),
  }).where(
    and(
      eq(generationJobsTable.status, "pending"),
      eq(generationJobsTable.id,
        sql`(SELECT id FROM generation_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1)`
      )
    )
  ).returning();

  const job = claimed[0];
  if (!job) return;

  console.log(`[JobWorker] Processing job #${job.id} (${job.jobType})`);

  try {
    switch (job.jobType) {
      case "image":
        await processImageJob(job.id, job.requestJson as ImageJobPayload);
        break;
      case "video":
        await processVideoJob(job.id, job.requestJson as VideoJobPayload);
        break;
      case "render":
        await processRenderJob(job.id, job.requestJson as RenderJobPayload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }

    await db.update(generationJobsTable).set({
      status: "completed",
      updatedAt: new Date(),
      completedAt: new Date(),
    }).where(eq(generationJobsTable.id, job.id));

    console.log(`[JobWorker] Job #${job.id} completed`);
  } catch (err: any) {
    console.error(`[JobWorker] Job #${job.id} failed:`, err.message);

    const currentJob = await db.select().from(generationJobsTable).where(eq(generationJobsTable.id, job.id)).then(r => r[0]);
    const retryCount = (currentJob?.retryCount || 0) + 1;
    const maxRetries = currentJob?.maxRetries || 1;

    if (retryCount < maxRetries) {
      await db.update(generationJobsTable).set({
        status: "pending",
        retryCount,
        errorMessage: err.message,
        updatedAt: new Date(),
      }).where(eq(generationJobsTable.id, job.id));
      console.log(`[JobWorker] Job #${job.id} queued for retry (${retryCount}/${maxRetries})`);
    } else {
      await db.update(generationJobsTable).set({
        status: "failed",
        retryCount,
        errorMessage: err.message,
        updatedAt: new Date(),
        completedAt: new Date(),
      }).where(eq(generationJobsTable.id, job.id));
    }
  }
}

async function processImageJob(jobId: number, payload: ImageJobPayload) {
  const { shotId, projectId, prompt, negativePrompt, width = 1024, height = 1024 } = payload;

  const buffer = await generateImage({ prompt, negativePrompt, width, height });

  ensureDir(ASSETS_DIR);
  const filename = `shot_${shotId}_${Date.now()}.png`;
  const filepath = path.join(ASSETS_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  const imageUrl = `/generated/${filename}`;

  const [asset] = await db.insert(assetsTable).values({
    projectId,
    assetType: "image",
    storageUri: imageUrl,
    thumbnailUri: imageUrl,
    width,
    height,
    metadataJson: { prompt, negativePrompt, shotId, generationJobId: jobId, provider: "comfyui" },
  }).returning();

  await db.insert(storyboardFramesTable).values({
    shotId,
    assetId: asset.id,
  });

  await db.update(shotsTable).set({
    thumbnailUri: imageUrl,
    status: "has_frame",
  }).where(eq(shotsTable.id, shotId));

  await db.update(generationJobsTable).set({
    outputAssetId: asset.id,
  }).where(eq(generationJobsTable.id, jobId));

  try {
    await evaluateAsset(asset.id, jobId, prompt, imageUrl, "image");
  } catch (evalErr) {
    console.error(`[JobWorker] Evaluation failed for asset #${asset.id}:`, evalErr);
  }
}

async function processVideoJob(jobId: number, payload: VideoJobPayload) {
  const { shotId, projectId, prompt, imageFilePath, frames = 81, motionStrength = 128, seed } = payload;

  if (!fs.existsSync(imageFilePath)) {
    throw new Error("Source image file not found on disk");
  }

  const buffer = await generateVideo({ imageFilename: imageFilePath, prompt, frames, motionStrength, seed });

  ensureDir(ASSETS_DIR);
  const filename = `video_${shotId}_${Date.now()}.webp`;
  const filepath = path.join(ASSETS_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  const videoUrl = `/generated/${filename}`;

  const [shot] = await db.select().from(shotsTable).where(eq(shotsTable.id, shotId));

  const [asset] = await db.insert(assetsTable).values({
    projectId,
    assetType: "video",
    storageUri: videoUrl,
    thumbnailUri: shot?.thumbnailUri || null,
    metadataJson: { prompt, shotId, frames, motionStrength, generationJobId: jobId, provider: "wan2" },
  }).returning();

  await db.update(shotsTable).set({
    status: "has_video",
    videoUri: videoUrl,
  }).where(eq(shotsTable.id, shotId));

  await db.update(generationJobsTable).set({
    outputAssetId: asset.id,
  }).where(eq(generationJobsTable.id, jobId));

  try {
    await evaluateAsset(asset.id, jobId, prompt, videoUrl, "video");
  } catch (evalErr) {
    console.error(`[JobWorker] Evaluation failed for asset #${asset.id}:`, evalErr);
  }
}

async function processRenderJob(jobId: number, payload: RenderJobPayload) {
  const { projectId, audioPath } = payload;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) throw new Error("Project not found");

  const scenes = await db.select().from(scenesTable)
    .where(eq(scenesTable.projectId, projectId))
    .orderBy(scenesTable.orderIndex);

  const clips: RenderClip[] = [];
  for (const scene of scenes) {
    const shots = await db.select().from(shotsTable)
      .where(eq(shotsTable.sceneId, scene.id))
      .orderBy(shotsTable.orderIndex);

    for (const shot of shots) {
      const mediaUri = (shot.status === "has_video" && shot.videoUri) ? shot.videoUri : shot.thumbnailUri;
      if (!mediaUri) continue;

      const filename = path.basename(mediaUri);
      const filePath = path.join(ASSETS_DIR, filename);
      if (!fs.existsSync(filePath)) continue;

      clips.push({
        filePath,
        durationMs: shot.durationMs || 3000,
        type: (shot.status === "has_video" && shot.videoUri) ? "video" : "image",
      });
    }
  }

  if (clips.length === 0) throw new Error("No clips to render");

  ensureDir(EXPORTS_DIR);
  const outputFilename = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.mp4`;
  const outputPath = path.join(EXPORTS_DIR, outputFilename);

  let resolvedAudioPath: string | null = null;
  if (audioPath) {
    const resolved = path.resolve(ASSETS_DIR, path.basename(audioPath));
    if (resolved.startsWith(path.resolve(ASSETS_DIR)) && fs.existsSync(resolved)) {
      resolvedAudioPath = resolved;
    }
  }

  await renderTimeline({
    clips,
    outputPath,
    fps: 24,
    width: 1920,
    height: 1080,
    audioPath: resolvedAudioPath,
  });

  const exportUrl = `/exports/${outputFilename}`;

  const [asset] = await db.insert(assetsTable).values({
    projectId,
    assetType: "render",
    storageUri: exportUrl,
    metadataJson: { clipCount: clips.length, filename: outputFilename, generationJobId: jobId },
  }).returning();

  await db.update(generationJobsTable).set({
    outputAssetId: asset.id,
  }).where(eq(generationJobsTable.id, jobId));
}
