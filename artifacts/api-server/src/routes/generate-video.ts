import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, shotsTable, scenesTable } from "@workspace/db";
import { enqueueVideoJob } from "../services/job-queue/queue";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

const ASSETS_DIR = path.join(process.cwd(), "..", "director-os", "public", "generated");

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

  const { prompt, frames = 81, motionStrength = 128, seed } = req.body || {};
  const videoPrompt = prompt || shot.promptSummary || "A cinematic shot with subtle motion";

  const imageFilePath = path.join(ASSETS_DIR, path.basename(shot.thumbnailUri));
  if (!fs.existsSync(imageFilePath)) {
    res.status(400).json({ error: "Source image file not found on disk" });
    return;
  }

  try {
    const [scene] = await db.select().from(scenesTable).where(eq(scenesTable.id, shot.sceneId));
    const projectId = scene?.projectId || 0;

    const job = await enqueueVideoJob({
      shotId,
      projectId,
      prompt: videoPrompt,
      imageFilePath,
      frames,
      motionStrength,
      seed,
    }, { maxRetries: 2 });

    res.json({
      success: true,
      jobId: job.id,
      status: "queued",
      message: "Video generation job queued",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to queue video generation" });
  }
});

export default router;
