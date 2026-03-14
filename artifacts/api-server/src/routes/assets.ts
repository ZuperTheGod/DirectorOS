import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, assetsTable } from "@workspace/db";
import {
  ListAssetsParams,
  ListAssetsQueryParams,
  ListAssetsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:projectId/assets", async (req, res): Promise<void> => {
  const params = ListAssetsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListAssetsQueryParams.safeParse(req.query);

  const conditions = [eq(assetsTable.projectId, params.data.projectId)];
  if (query.success && query.data.assetType) {
    conditions.push(eq(assetsTable.assetType, query.data.assetType));
  }

  const assets = await db
    .select()
    .from(assetsTable)
    .where(and(...conditions))
    .orderBy(assetsTable.createdAt);

  const mapped = assets.map((a) => ({
    ...a,
    metadata: a.metadataJson,
  }));

  res.json(ListAssetsResponse.parse(mapped));
});

export default router;
