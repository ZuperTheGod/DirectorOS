import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  shotsTable,
  assetsTable,
  storyboardFramesTable,
  generationJobsTable,
  scenesTable,
  projectsTable,
} from "@workspace/db";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildImagePrompt } from "../services/director-agent";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

const ASSETS_DIR = path.join(process.cwd(), "..", "director-os", "public", "generated");

function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
}

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

  const prompt = customPrompt || buildImagePrompt({
    promptSummary: shot.promptSummary || "A cinematic shot",
    shotType: shot.shotType || "medium",
    cameraIntent: shot.cameraIntentJson as Record<string, string> | null,
  });

  try {
    const [scene] = await db.select().from(scenesTable).where(eq(scenesTable.id, shot.sceneId));
    const projectId = scene?.projectId;

    const [job] = await db.insert(generationJobsTable).values({
      projectId: projectId || 0,
      jobType: "image",
      provider: "openai-gpt-image-1",
      requestJson: { prompt, shotId },
      status: "processing",
    }).returning();

    const buffer = await generateImageBuffer(prompt, "1024x1024");

    ensureAssetsDir();
    const filename = `shot_${shotId}_${Date.now()}.png`;
    const filepath = path.join(ASSETS_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const imageUrl = `/generated/${filename}`;

    const [asset] = await db.insert(assetsTable).values({
      projectId: projectId || 0,
      assetType: "image",
      storageUri: imageUrl,
      thumbnailUri: imageUrl,
      width: 1024,
      height: 1024,
      metadataJson: { prompt, shotId, generationJobId: job.id },
    }).returning();

    await db.insert(storyboardFramesTable).values({
      shotId: shot.id,
      assetId: asset.id,
    });

    await db.update(shotsTable).set({
      thumbnailUri: imageUrl,
      status: "has_frame",
    }).where(eq(shotsTable.id, shotId));

    await db.update(generationJobsTable).set({
      status: "completed",
      completedAt: new Date(),
    }).where(eq(generationJobsTable.id, job.id));

    res.json({
      success: true,
      imageUrl,
      assetId: asset.id,
      shotId: shot.id,
    });
  } catch (err: any) {
    console.error("Image generation error:", err);

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

    res.status(500).json({ error: err.message || "Image generation failed" });
  }
});

router.post("/projects/:projectId/generate-all-images", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

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
    const total = shotsToGenerate.length;

    res.write(`data: ${JSON.stringify({ type: "start", total, message: `Generating ${total} images...` })}\n\n`);

    for (let i = 0; i < shotsToGenerate.length; i++) {
      const shot = shotsToGenerate[i];
      const prompt = buildImagePrompt({
        promptSummary: shot.promptSummary || "A cinematic shot",
        shotType: shot.shotType || "medium",
        cameraIntent: shot.cameraIntentJson as Record<string, string> | null,
      });

      res.write(`data: ${JSON.stringify({
        type: "progress",
        current: i + 1,
        total,
        shotId: shot.id,
        message: `Generating image ${i + 1}/${total}...`,
      })}\n\n`);

      try {
        const buffer = await generateImageBuffer(prompt, "1024x1024");

        ensureAssetsDir();
        const filename = `shot_${shot.id}_${Date.now()}.png`;
        const filepath = path.join(ASSETS_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        const imageUrl = `/generated/${filename}`;

        const [asset] = await db.insert(assetsTable).values({
          projectId,
          assetType: "image",
          storageUri: imageUrl,
          thumbnailUri: imageUrl,
          width: 1024,
          height: 1024,
          metadataJson: { prompt, shotId: shot.id },
        }).returning();

        await db.insert(storyboardFramesTable).values({
          shotId: shot.id,
          assetId: asset.id,
        });

        await db.update(shotsTable).set({
          thumbnailUri: imageUrl,
          status: "has_frame",
        }).where(eq(shotsTable.id, shot.id));

        res.write(`data: ${JSON.stringify({
          type: "completed",
          current: i + 1,
          total,
          shotId: shot.id,
          imageUrl,
        })}\n\n`);
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({
          type: "error",
          shotId: shot.id,
          message: err.message,
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done", message: "All images generated!" })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    res.end();
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
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2048,
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
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
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
