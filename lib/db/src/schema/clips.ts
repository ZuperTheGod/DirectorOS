import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { assetsTable } from "./assets";

export const clipsTable = pgTable("clips", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  shotId: integer("shot_id"),
  assetId: integer("asset_id").references(() => assetsTable.id),
  clipType: text("clip_type").notNull(),
  label: text("label"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClipSchema = createInsertSchema(clipsTable).omit({ id: true, createdAt: true });
export type InsertClip = z.infer<typeof insertClipSchema>;
export type Clip = typeof clipsTable.$inferSelect;
