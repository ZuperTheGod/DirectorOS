import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const continuityProfilesTable = pgTable("continuity_profiles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  dimensionType: text("dimension_type").notNull(),
  strengthLevel: text("strength_level").default("medium"),
  referenceDataJson: jsonb("reference_data_json"),
  embeddingsJson: jsonb("embeddings_json"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContinuityProfileSchema = createInsertSchema(continuityProfilesTable).omit({ id: true, updatedAt: true });
export type InsertContinuityProfile = z.infer<typeof insertContinuityProfileSchema>;
export type ContinuityProfile = typeof continuityProfilesTable.$inferSelect;
