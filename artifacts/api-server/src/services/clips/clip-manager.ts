import { eq, and } from "drizzle-orm";
import { db, clipsTable, assetsTable } from "@workspace/db";

export async function createClip(params: {
  projectId: number;
  shotId?: number;
  assetId?: number;
  clipType: string;
  label?: string;
  durationMs?: number;
}) {
  const [clip] = await db.insert(clipsTable).values({
    projectId: params.projectId,
    shotId: params.shotId || null,
    assetId: params.assetId || null,
    clipType: params.clipType,
    label: params.label || null,
    durationMs: params.durationMs || null,
  }).returning();
  return clip;
}

export async function deleteClip(clipId: number) {
  await db.delete(clipsTable).where(eq(clipsTable.id, clipId));
}

export async function listProjectClips(projectId: number) {
  const clips = await db.select({
    clip: clipsTable,
    asset: assetsTable,
  })
    .from(clipsTable)
    .leftJoin(assetsTable, eq(clipsTable.assetId, assetsTable.id))
    .where(eq(clipsTable.projectId, projectId))
    .orderBy(clipsTable.createdAt);

  return clips.map(row => ({
    ...row.clip,
    asset: row.asset,
  }));
}

export async function autoCreateClipsFromAssets(projectId: number) {
  const assets = await db.select().from(assetsTable)
    .where(eq(assetsTable.projectId, projectId));

  const existingClips = await db.select().from(clipsTable)
    .where(eq(clipsTable.projectId, projectId));

  const existingAssetIds = new Set(existingClips.map(c => c.assetId));

  const newClips = [];
  for (const asset of assets) {
    if (existingAssetIds.has(asset.id)) continue;
    if (asset.assetType === "render") continue;

    const metadata = asset.metadataJson as any;
    const [clip] = await db.insert(clipsTable).values({
      projectId,
      shotId: metadata?.shotId || null,
      assetId: asset.id,
      clipType: asset.assetType,
      label: metadata?.shotId ? `Shot ${metadata.shotId}` : `${asset.assetType}_${asset.id}`,
      durationMs: asset.durationMs || 3000,
    }).returning();
    newClips.push(clip);
  }

  return newClips;
}
