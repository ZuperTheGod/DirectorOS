import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const promptVersionsTable = pgTable("prompt_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  linkedEntityType: text("linked_entity_type"),
  linkedEntityId: integer("linked_entity_id"),
  promptText: text("prompt_text").notNull(),
  negativePromptText: text("negative_prompt_text"),
  structuredPromptJson: jsonb("structured_prompt_json"),
  revisionReason: text("revision_reason"),
  parentPromptVersionId: integer("parent_prompt_version_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromptVersionSchema = createInsertSchema(promptVersionsTable).omit({ id: true, createdAt: true });
export type InsertPromptVersion = z.infer<typeof insertPromptVersionSchema>;
export type PromptVersion = typeof promptVersionsTable.$inferSelect;
