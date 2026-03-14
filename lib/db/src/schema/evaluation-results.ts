import { pgTable, serial, integer, real, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { generationJobsTable } from "./generation-jobs";
import { assetsTable } from "./assets";

export const evaluationResultsTable = pgTable("evaluation_results", {
  id: serial("id").primaryKey(),
  generationJobId: integer("generation_job_id").references(() => generationJobsTable.id),
  assetId: integer("asset_id").references(() => assetsTable.id),
  totalScore: real("total_score"),
  subScoresJson: jsonb("sub_scores_json"),
  diagnosticsJson: jsonb("diagnostics_json"),
  recommendedAction: text("recommended_action"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEvaluationResultSchema = createInsertSchema(evaluationResultsTable).omit({ id: true, createdAt: true });
export type InsertEvaluationResult = z.infer<typeof insertEvaluationResultSchema>;
export type EvaluationResult = typeof evaluationResultsTable.$inferSelect;
