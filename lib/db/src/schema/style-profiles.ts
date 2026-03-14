import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const styleProfilesTable = pgTable("style_profiles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id),
  name: text("name").notNull(),
  styleDescriptor: text("style_descriptor"),
  colorPaletteJson: jsonb("color_palette_json"),
  lightingPrefsJson: jsonb("lighting_prefs_json"),
  referenceAssetIds: jsonb("reference_asset_ids"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStyleProfileSchema = createInsertSchema(styleProfilesTable).omit({ id: true, createdAt: true });
export type InsertStyleProfile = z.infer<typeof insertStyleProfileSchema>;
export type StyleProfile = typeof styleProfilesTable.$inferSelect;
