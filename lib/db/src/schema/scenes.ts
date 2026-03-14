import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const scenesTable = pgTable("scenes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull(),
  summary: text("summary"),
  startTimeMs: integer("start_time_ms"),
  endTimeMs: integer("end_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSceneSchema = createInsertSchema(scenesTable).omit({ id: true, createdAt: true });
export type InsertScene = z.infer<typeof insertSceneSchema>;
export type Scene = typeof scenesTable.$inferSelect;
