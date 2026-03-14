import { pgTable, serial, integer, text, jsonb, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const generationJobsTable = pgTable("generation_jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  jobType: text("job_type").notNull(),
  provider: text("provider"),
  requestJson: jsonb("request_json"),
  status: text("status").notNull().default("pending"),
  progress: real("progress"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertGenerationJobSchema = createInsertSchema(generationJobsTable).omit({ id: true, createdAt: true });
export type InsertGenerationJob = z.infer<typeof insertGenerationJobSchema>;
export type GenerationJob = typeof generationJobsTable.$inferSelect;
