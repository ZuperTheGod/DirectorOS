import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  shotsTable,
  assetsTable,
  generationJobsTable,
  scenesTable,
} from "@workspace/db";
import { generateVideo } from "../services/connectors/video-connector";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

const ASSETS_DIR = path.join(process.cwd(), "..", "director-os", "public", "generated");

function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
}

router.post("/shots/:shotId/generate-video", async (req, res): Promise<void> => {
  const shotId = parseInt(req.params.shotId);
  if (isNaN(shotId)) {
    res.status(400).json({ error: "Invalid shot ID" });
    return;
  }

  const [shot] = await db.select().from(shotsTable).where(eq(shotsTable.id, shotId));
  if (!shot) {
    res.status(404).json({ error: "Shot not found" });
    return;
  }

  if (!shot.thumbnailUri) {
    res.status(400).json({ error: "Shot must have an image before generating video. Generate an image first." });
    return;
  }

  const {
    prompt,
    frames = 81,
    motionStrength = 128,
    seed,
  } = req.body || {};

  const videoPrompt = prompt || shot.promptSummary || "A cinematic shot with subtle motion";

  try {
    const [scene] = await db.select().from(scenesTable).where(eq(scenesTable.id, shot.sceneId));
    const projectId = scene?.projectId;

    const imageFilePath = path.join(ASSETS_DIR, path.basename(shot.thumbnailUri));
    if (!fs.existsSync(imageFilePath)) {
      res.status(400).json({ error: "Source image file not found on disk" });
      return;
    }

    const [job] = await db.insert(generationJobsTable).values({
      projectId: projectId || 0,
      jobType: "video",
      provider: "wan2-comfyui",
      requestJson: { prompt: videoPrompt, shotId, frames, motionStrength, seed },
      status: "processing",
    }).returning();

    const buffer = await generateVideo({
      imageFilename: imageFilePath,
      prompt: videoPrompt,
      frames,
      motionStrength,
      seed,
    });

    ensureAssetsDir();
    const filename = `video_${shotId}_${Date.now()}.webp`;
    const filepath = path.join(ASSETS_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const videoUrl = `/generated/${filename}`;

    const [asset] = await db.insert(assetsTable).values({
      projectId: projectId || 0,
      assetType: "video",
      storageUri: videoUrl,
      thumbnailUri: shot.thumbnailUri,
      metadataJson: { prompt: videoPrompt, shotId, frames, motionStrength, generationJobId: job.id, provider: "wan2" },
    }).returning();

    await db.update(shotsTable).set({
      status: "has_video",
      videoUri: videoUrl,
    }).where(eq(shotsTable.id, shotId));

    await db.update(generationJobsTable).set({
      status: "completed",
      completedAt: new Date(),
    }).where(eq(generationJobsTable.id, job.id));

    res.json({
      success: true,
      videoUrl,
      assetId: asset.id,
      shotId: shot.id,
    });
  } catch (err: any) {
    console.error("Video generation error:", err);

    try {
      const jobs = await db.select().from(generationJobsTable)
        .where(eq(generationJobsTable.status, "processing"));
      for (const j of jobs) {
        const req = j.requestJson as any;
        if (req?.shotId === shotId) {
          await db.update(generationJobsTable).set({
            status: "failed",
            completedAt: new Date(),
          }).where(eq(generationJobsTable.id, j.id));
        }
      }
    } catch {}

    res.status(500).json({ error: err.message || "Video generation failed" });
  }
});

export default router;
