import { eq, and } from "drizzle-orm";
import { db, timelineClipsTable, timelineSequencesTable } from "@workspace/db";

export async function ensureDefaultSequence(projectId: number) {
  const [existing] = await db.select().from(timelineSequencesTable)
    .where(eq(timelineSequencesTable.projectId, projectId))
    .limit(1);

  if (existing) return existing;

  const [seq] = await db.insert(timelineSequencesTable).values({
    projectId,
    name: "Main Timeline",
    settingsJson: { fps: 24, width: 1920, height: 1080 },
  }).returning();

  return seq;
}

export async function addClipToTimeline(params: {
  sequenceId: number;
  assetId: number;
  trackIndex: number;
  trackType: string;
  startMs: number;
  endMs: number;
}) {
  const [clip] = await db.insert(timelineClipsTable).values({
    sequenceId: params.sequenceId,
    assetId: params.assetId,
    trackIndex: params.trackIndex,
    trackType: params.trackType,
    startMs: params.startMs,
    endMs: params.endMs,
  }).returning();
  return clip;
}

export async function removeClipFromTimeline(clipId: number) {
  await db.delete(timelineClipsTable).where(eq(timelineClipsTable.id, clipId));
}

export async function getTimelineClips(sequenceId: number) {
  return db.select().from(timelineClipsTable)
    .where(eq(timelineClipsTable.sequenceId, sequenceId))
    .orderBy(timelineClipsTable.startMs);
}

export async function moveClip(clipId: number, newStartMs: number, newEndMs: number) {
  await db.update(timelineClipsTable).set({
    startMs: newStartMs,
    endMs: newEndMs,
  }).where(eq(timelineClipsTable.id, clipId));
}
