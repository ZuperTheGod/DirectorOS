import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, generationJobsTable } from "@workspace/db";
import {
  ListGenerationJobsParams,
  ListGenerationJobsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:projectId/generation-jobs", async (req, res): Promise<void> => {
  const params = ListGenerationJobsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const jobs = await db
    .select()
    .from(generationJobsTable)
    .where(eq(generationJobsTable.projectId, params.data.projectId))
    .orderBy(generationJobsTable.createdAt);

  res.json(ListGenerationJobsResponse.parse(jobs));
});

export default router;
