import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { timelineSequencesTable } from "./timeline-sequences";
import { assetsTable } from "./assets";

export const timelineClipsTable = pgTable("timeline_clips", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").references(() => timelineSequencesTable.id).notNull(),
  assetId: integer("asset_id").references(() => assetsTable.id),
  trackIndex: integer("track_index").notNull(),
  trackType: text("track_type").notNull(),
  startMs: integer("start_ms").notNull(),
  endMs: integer("end_ms").notNull(),
  inPointMs: integer("in_point_ms"),
  outPointMs: integer("out_point_ms"),
  propertiesJson: jsonb("properties_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimelineClipSchema = createInsertSchema(timelineClipsTable).omit({ id: true, createdAt: true });
export type InsertTimelineClip = z.infer<typeof insertTimelineClipSchema>;
export type TimelineClip = typeof timelineClipsTable.$inferSelect;
