import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, shotsTable } from "@workspace/db";
import {
  ListShotsParams,
  ListShotsResponse,
  CreateShotParams,
  CreateShotBody,
  UpdateShotParams,
  UpdateShotBody,
  UpdateShotResponse,
  DeleteShotParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/scenes/:sceneId/shots", async (req, res): Promise<void> => {
  const params = ListShotsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const shots = await db
    .select()
    .from(shotsTable)
    .where(eq(shotsTable.sceneId, params.data.sceneId))
    .orderBy(shotsTable.orderIndex);

  const mapped = shots.map((s) => ({
    ...s,
    cameraIntent: s.cameraIntentJson,
    motionIntent: s.motionIntentJson,
    thumbnailUrl: s.thumbnailUri,
  }));

  res.json(ListShotsResponse.parse(mapped));
});

router.post("/scenes/:sceneId/shots", async (req, res): Promise<void> => {
  const params = CreateShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateShotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [shot] = await db.insert(shotsTable).values({
    sceneId: params.data.sceneId,
    orderIndex: parsed.data.orderIndex,
    shotType: parsed.data.shotType,
    durationMs: parsed.data.durationMs,
    promptSummary: parsed.data.promptSummary,
    cameraIntentJson: parsed.data.cameraIntent,
    motionIntentJson: parsed.data.motionIntent,
    status: "empty",
  }).returning();

  const mapped = {
    ...shot,
    cameraIntent: shot.cameraIntentJson,
    motionIntent: shot.motionIntentJson,
    thumbnailUrl: shot.thumbnailUri,
  };

  res.status(201).json(ListShotsResponse.element.parse(mapped));
});

router.patch("/shots/:shotId", async (req, res): Promise<void> => {
  const params = UpdateShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateShotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.orderIndex !== undefined) updateData.orderIndex = parsed.data.orderIndex;
  if (parsed.data.shotType !== undefined) updateData.shotType = parsed.data.shotType;
  if (parsed.data.durationMs !== undefined) updateData.durationMs = parsed.data.durationMs;
  if (parsed.data.promptSummary !== undefined) updateData.promptSummary = parsed.data.promptSummary;
  if (parsed.data.cameraIntent !== undefined) updateData.cameraIntentJson = parsed.data.cameraIntent;
  if (parsed.data.motionIntent !== undefined) updateData.motionIntentJson = parsed.data.motionIntent;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [shot] = await db
    .update(shotsTable)
    .set(updateData)
    .where(eq(shotsTable.id, params.data.shotId))
    .returning();

  if (!shot) {
    res.status(404).json({ error: "Shot not found" });
    return;
  }

  const mapped = {
    ...shot,
    cameraIntent: shot.cameraIntentJson,
    motionIntent: shot.motionIntentJson,
    thumbnailUrl: shot.thumbnailUri,
  };

  res.json(UpdateShotResponse.parse(mapped));
});

router.delete("/shots/:shotId", async (req, res): Promise<void> => {
  const params = DeleteShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [shot] = await db
    .delete(shotsTable)
    .where(eq(shotsTable.id, params.data.shotId))
    .returning();

  if (!shot) {
    res.status(404).json({ error: "Shot not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
