import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, scenesTable, shotsTable } from "@workspace/db";
import {
  ListScenesParams,
  ListScenesResponse,
  CreateSceneParams,
  CreateSceneBody,
  UpdateSceneParams,
  UpdateSceneBody,
  UpdateSceneResponse,
  DeleteSceneParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:projectId/scenes", async (req, res): Promise<void> => {
  const params = ListScenesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, params.data.projectId))
    .orderBy(scenesTable.orderIndex);

  res.json(ListScenesResponse.parse(scenes));
});

router.post("/projects/:projectId/scenes", async (req, res): Promise<void> => {
  const params = CreateSceneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateSceneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [scene] = await db.insert(scenesTable).values({
    projectId: params.data.projectId,
    name: parsed.data.name,
    orderIndex: parsed.data.orderIndex,
    summary: parsed.data.summary,
    startTimeMs: parsed.data.startTimeMs,
    endTimeMs: parsed.data.endTimeMs,
  }).returning();

  res.status(201).json(ListScenesResponse.element.parse(scene));
});

router.patch("/scenes/:sceneId", async (req, res): Promise<void> => {
  const params = UpdateSceneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSceneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [scene] = await db
    .update(scenesTable)
    .set(parsed.data)
    .where(eq(scenesTable.id, params.data.sceneId))
    .returning();

  if (!scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }

  res.json(UpdateSceneResponse.parse(scene));
});

router.delete("/scenes/:sceneId", async (req, res): Promise<void> => {
  const params = DeleteSceneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(shotsTable).where(eq(shotsTable.sceneId, params.data.sceneId));

  const [scene] = await db
    .delete(scenesTable)
    .where(eq(scenesTable.id, params.data.sceneId))
    .returning();

  if (!scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
