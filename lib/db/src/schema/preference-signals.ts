import { pgTable, serial, integer, text, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const preferenceSignalsTable = pgTable("preference_signals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  projectId: integer("project_id"),
  signalType: text("signal_type").notNull(),
  strength: real("strength"),
  sourceEventId: integer("source_event_id"),
  extractedFeatureJson: jsonb("extracted_feature_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPreferenceSignalSchema = createInsertSchema(preferenceSignalsTable).omit({ id: true, createdAt: true });
export type InsertPreferenceSignal = z.infer<typeof insertPreferenceSignalSchema>;
export type PreferenceSignal = typeof preferenceSignalsTable.$inferSelect;
