import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, clipsTable } from "@workspace/db";
import { createClip, deleteClip, listProjectClips, autoCreateClipsFromAssets } from "../services/clips/clip-manager";

const router: IRouter = Router();

router.get("/projects/:projectId/clips", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  try {
    const clips = await listProjectClips(projectId);
    res.json(clips);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:projectId/clips", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const { shotId, assetId, clipType, label, durationMs } = req.body || {};
  if (!clipType) {
    res.status(400).json({ error: "clipType is required" });
    return;
  }

  try {
    const clip = await createClip({
      projectId,
      shotId,
      assetId,
      clipType,
      label,
      durationMs,
    });
    res.json(clip);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:projectId/clips/sync", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  try {
    const newClips = await autoCreateClipsFromAssets(projectId);
    const allClips = await listProjectClips(projectId);
    res.json({
      newClipsCreated: newClips.length,
      totalClips: allClips.length,
      clips: allClips,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/clips/:clipId", async (req, res): Promise<void> => {
  const clipId = parseInt(req.params.clipId);
  if (isNaN(clipId)) {
    res.status(400).json({ error: "Invalid clip ID" });
    return;
  }

  try {
    await deleteClip(clipId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
