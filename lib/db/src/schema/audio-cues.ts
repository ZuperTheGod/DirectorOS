import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const audioCuesTable = pgTable("audio_cues", {
  id: serial("id").primaryKey(),
  shotId: integer("shot_id"),
  sequenceId: integer("sequence_id"),
  cueType: text("cue_type").notNull(),
  description: text("description"),
  timeMs: integer("time_ms"),
  durationMs: integer("duration_ms"),
  parametersJson: jsonb("parameters_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAudioCueSchema = createInsertSchema(audioCuesTable).omit({ id: true, createdAt: true });
export type InsertAudioCue = z.infer<typeof insertAudioCueSchema>;
export type AudioCue = typeof audioCuesTable.$inferSelect;
