import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  shotsTable,
  scenesTable,
  generationJobsTable,
} from "@workspace/db";
import { buildImagePrompt } from "../services/director-agent";
import { enqueueImageJob } from "../services/job-queue/queue";
import { getLLMProvider } from "../services/llm/llm-service";

const router: IRouter = Router();

router.post("/shots/:shotId/generate-image", async (req, res): Promise<void> => {
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

  const customPrompt = req.body?.prompt;
  const negativePrompt = req.body?.negativePrompt;

  const prompt = customPrompt || buildImagePrompt({
    promptSummary: shot.promptSummary || "A cinematic shot",
    shotType: shot.shotType || "medium",
    cameraIntent: shot.cameraIntentJson as Record<string, string> | null,
  });

  try {
    const [scene] = await db.select().from(scenesTable).where(eq(scenesTable.id, shot.sceneId));
    const projectId = scene?.projectId || 0;

    const job = await enqueueImageJob({
      shotId,
      projectId,
      prompt,
      negativePrompt,
      width: 1024,
      height: 1024,
    }, { maxRetries: 2 });

    res.json({
      success: true,
      jobId: job.id,
      status: "queued",
      message: "Image generation job queued",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to queue image generation" });
  }
});

router.post("/projects/:projectId/generate-all-images", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  try {
    const scenes = await db.select().from(scenesTable)
      .where(eq(scenesTable.projectId, projectId))
      .orderBy(scenesTable.orderIndex);

    const allShots: any[] = [];
    for (const scene of scenes) {
      const shots = await db.select().from(shotsTable)
        .where(eq(shotsTable.sceneId, scene.id))
        .orderBy(shotsTable.orderIndex);
      allShots.push(...shots);
    }

    const shotsToGenerate = allShots.filter(s => s.status === "empty" || !s.thumbnailUri);
    const jobIds: number[] = [];

    for (const shot of shotsToGenerate) {
      const prompt = buildImagePrompt({
        promptSummary: shot.promptSummary || "A cinematic shot",
        shotType: shot.shotType || "medium",
        cameraIntent: shot.cameraIntentJson as Record<string, string> | null,
      });

      const job = await enqueueImageJob({
        shotId: shot.id,
        projectId,
        prompt,
        width: 1024,
        height: 1024,
      }, { maxRetries: 2 });

      jobIds.push(job.id);
    }

    res.json({
      success: true,
      totalQueued: jobIds.length,
      jobIds,
      message: `${jobIds.length} image generation jobs queued`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to queue batch image generation" });
  }
});

router.post("/shots/:shotId/generate-video-prompt", async (req, res): Promise<void> => {
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

  try {
    const llm = await getLLMProvider();
    const content = await llm.chat({
      messages: [
        {
          role: "system",
          content: `You are a video generation prompt engineer. Transform image descriptions and shot metadata into optimized video generation prompts. Output JSON with:
{
  "videoPrompt": "Optimized prompt for video generation describing motion and temporal elements",
  "recommendedModel": "kling|runway|pika|minimax",
  "settings": {
    "motion": "low|medium|high",
    "cameraMotion": "Description of camera movement",
    "duration": 3-8,
    "fps": 24,
    "aspectRatio": "16:9"
  },
  "reasoning": "Why this model and these settings"
}`
        },
        {
          role: "user",
          content: `Shot details:\n- Type: ${shot.shotType}\n- Description: ${shot.promptSummary}\n- Camera Intent: ${JSON.stringify(shot.cameraIntentJson)}\n- Motion Intent: ${JSON.stringify(shot.motionIntentJson)}\n- Duration: ${shot.durationMs}ms\n\nTransform this into an optimal video generation prompt.`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    if (!content) {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate video prompt" });
  }
});

export default router;
