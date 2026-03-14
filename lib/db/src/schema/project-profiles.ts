import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectProfilesTable = pgTable("project_profiles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  aestheticSummary: text("aesthetic_summary"),
  pacingSummary: text("pacing_summary"),
  continuityPoliciesJson: jsonb("continuity_policies_json"),
  learnedPreferencesJson: jsonb("learned_preferences_json"),
  modelPreferencesJson: jsonb("model_preferences_json"),
  confidenceJson: jsonb("confidence_json"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectProfileSchema = createInsertSchema(projectProfilesTable).omit({ id: true, updatedAt: true });
export type InsertProjectProfile = z.infer<typeof insertProjectProfileSchema>;
export type ProjectProfile = typeof projectProfilesTable.$inferSelect;
