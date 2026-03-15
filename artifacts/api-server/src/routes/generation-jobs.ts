import { Router, type IRouter } from "express";
import { eq, desc, or, and, inArray } from "drizzle-orm";
import { db, generationJobsTable, evaluationResultsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/generation-jobs", async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  let query = db.select().from(generationJobsTable).orderBy(desc(generationJobsTable.createdAt)).limit(limit);

  if (status) {
    const statuses = status.split(",");
    const jobs = await db.select().from(generationJobsTable)
      .where(inArray(generationJobsTable.status, statuses))
      .orderBy(desc(generationJobsTable.createdAt))
      .limit(limit);
    res.json(jobs);
    return;
  }

  const jobs = await query;
  res.json(jobs);
});

router.get("/generation-jobs/:jobId", async (req, res): Promise<void> => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const [job] = await db.select().from(generationJobsTable).where(eq(generationJobsTable.id, jobId));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const evaluations = await db.select().from(evaluationResultsTable)
    .where(eq(evaluationResultsTable.generationJobId, jobId));

  res.json({ ...job, evaluations });
});

router.get("/projects/:projectId/generation-jobs", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const jobs = await db.select().from(generationJobsTable)
    .where(eq(generationJobsTable.projectId, projectId))
    .orderBy(desc(generationJobsTable.createdAt));

  res.json(jobs);
});

export default router;
