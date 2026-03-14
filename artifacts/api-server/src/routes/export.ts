import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  projectsTable,
  scenesTable,
  shotsTable,
} from "@workspace/db";
import { renderTimeline, type TimelineClip } from "../services/connectors/render-connector";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

const ASSETS_DIR = path.join(process.cwd(), "..", "director-os", "public", "generated");
const EXPORTS_DIR = path.join(process.cwd(), "..", "director-os", "public", "exports");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

router.post("/projects/:projectId/export", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    const scenes = await db.select().from(scenesTable)
      .where(eq(scenesTable.projectId, projectId))
      .orderBy(scenesTable.orderIndex);

    const clips: TimelineClip[] = [];
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

    if (clips.length === 0) {
      res.status(400).json({ error: "No clips to export. Generate images or videos first." });
      return;
    }

    ensureDir(EXPORTS_DIR);
    const outputFilename = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.mp4`;
    const outputPath = path.join(EXPORTS_DIR, outputFilename);

    let audioPath: string | null = null;
    if (req.body?.audioPath) {
      const resolved = path.resolve(ASSETS_DIR, path.basename(req.body.audioPath));
      if (resolved.startsWith(path.resolve(ASSETS_DIR)) && fs.existsSync(resolved)) {
        audioPath = resolved;
      }
    }

    await renderTimeline({
      clips,
      outputPath,
      fps: 24,
      width: 1920,
      height: 1080,
      audioPath,
    });

    const exportUrl = `/exports/${outputFilename}`;

    res.json({
      success: true,
      exportUrl,
      clipCount: clips.length,
      filename: outputFilename,
    });
  } catch (err: any) {
    console.error("Export error:", err);
    res.status(500).json({ error: err.message || "Export failed" });
  }
});

export default router;
