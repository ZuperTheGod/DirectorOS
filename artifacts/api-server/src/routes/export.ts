import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { enqueueRenderJob } from "../services/job-queue/queue";

const router: IRouter = Router();

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
    const audioPath = req.body?.audioPath || null;

    const job = await enqueueRenderJob({
      projectId,
      audioPath,
    });

    res.json({
      success: true,
      jobId: job.id,
      status: "queued",
      message: "Timeline render job queued",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to queue render" });
  }
});

export default router;
