import { eq, asc } from "drizzle-orm";
import { db, clipsTable, assetsTable, shotsTable, scenesTable } from "@workspace/db";

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

  const scenes = await db.select().from(scenesTable)
    .where(eq(scenesTable.projectId, projectId))
    .orderBy(asc(scenesTable.orderIndex));

  const allShots: Array<{ id: number; sceneOrder: number; shotOrder: number }> = [];
  for (const scene of scenes) {
    const sceneShots = await db.select().from(shotsTable)
      .where(eq(shotsTable.sceneId, scene.id))
      .orderBy(asc(shotsTable.orderIndex));
    for (const shot of sceneShots) {
      allShots.push({
        id: shot.id,
        sceneOrder: scene.orderIndex,
        shotOrder: shot.orderIndex,
      });
    }
  }

  const shotOrderMap = new Map(allShots.map((s, idx) => [s.id, idx]));

  const eligibleAssets = assets
    .filter(a => !existingAssetIds.has(a.id) && a.assetType !== "render")
    .sort((a, b) => {
      const metaA = a.metadataJson as any;
      const metaB = b.metadataJson as any;
      const orderA = metaA?.shotId ? (shotOrderMap.get(metaA.shotId) ?? 9999) : 9999;
      const orderB = metaB?.shotId ? (shotOrderMap.get(metaB.shotId) ?? 9999) : 9999;
      return orderA - orderB;
    });

  const newClips = [];
  for (const asset of eligibleAssets) {
    const metadata = asset.metadataJson as any;
    const shotId = metadata?.shotId || null;
    const shotInfo = shotId ? allShots.find(s => s.id === shotId) : null;
    const label = shotInfo
      ? `SC${shotInfo.sceneOrder + 1}_SH${shotInfo.shotOrder + 1}`
      : metadata?.shotId ? `Shot ${metadata.shotId}` : `${asset.assetType}_${asset.id}`;

    const [clip] = await db.insert(clipsTable).values({
      projectId,
      shotId,
      assetId: asset.id,
      clipType: asset.assetType,
      label,
      durationMs: asset.durationMs || 3000,
    }).returning();
    newClips.push(clip);
  }

  return newClips;
}
