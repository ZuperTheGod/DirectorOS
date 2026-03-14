import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const timelineSequencesTable = pgTable("timeline_sequences", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  name: text("name").notNull(),
  settingsJson: jsonb("settings_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTimelineSequenceSchema = createInsertSchema(timelineSequencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTimelineSequence = z.infer<typeof insertTimelineSequenceSchema>;
export type TimelineSequence = typeof timelineSequencesTable.$inferSelect;
