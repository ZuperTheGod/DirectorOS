import { pgTable, serial, integer, text, jsonb, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const generationJobsTable = pgTable("generation_jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  shotId: integer("shot_id"),
  jobType: text("job_type").notNull(),
  provider: text("provider"),
  requestJson: jsonb("request_json"),
  outputAssetId: integer("output_asset_id"),
  status: text("status").notNull().default("pending"),
  progress: real("progress"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertGenerationJobSchema = createInsertSchema(generationJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGenerationJob = z.infer<typeof insertGenerationJobSchema>;
export type GenerationJob = typeof generationJobsTable.$inferSelect;
