import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, projectsTable, scenesTable, shotsTable, assetsTable, generationJobsTable } from "@workspace/db";
import {
  CreateProjectBody,
  ListProjectsResponse,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (_req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(projectsTable.createdAt);
  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.insert(projectsTable).values({
    name: parsed.data.name,
    description: parsed.data.description,
    aspectRatio: parsed.data.aspectRatio,
    targetDuration: parsed.data.targetDuration,
    status: "draft",
  }).returning();

  res.status(201).json(ListProjectsResponse.element.parse(project));
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, project.id))
    .orderBy(scenesTable.orderIndex);

  const scenesWithShots = await Promise.all(
    scenes.map(async (scene) => {
      const shots = await db
        .select()
        .from(shotsTable)
        .where(eq(shotsTable.sceneId, scene.id))
        .orderBy(shotsTable.orderIndex);
      return {
        ...scene,
        shots: shots.map((s) => ({
          ...s,
          cameraIntent: s.cameraIntentJson,
          motionIntent: s.motionIntentJson,
          thumbnailUrl: s.thumbnailUri,
        })),
      };
    })
  );

  const [assetCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assetsTable)
    .where(eq(assetsTable.projectId, project.id));

  const [jobCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generationJobsTable)
    .where(eq(generationJobsTable.projectId, project.id));

  res.json(GetProjectResponse.parse({
    ...project,
    scenes: scenesWithShots,
    assetCount: assetCount?.count ?? 0,
    generationJobCount: jobCount?.count ?? 0,
  }));
});

router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projectsTable.id, params.data.projectId))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(UpdateProjectResponse.parse(project));
});

router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
