import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const characterProfilesTable = pgTable("character_profiles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  referenceAssetIds: jsonb("reference_asset_ids"),
  appearanceJson: jsonb("appearance_json"),
  embeddingJson: jsonb("embedding_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCharacterProfileSchema = createInsertSchema(characterProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCharacterProfile = z.infer<typeof insertCharacterProfileSchema>;
export type CharacterProfile = typeof characterProfilesTable.$inferSelect;
