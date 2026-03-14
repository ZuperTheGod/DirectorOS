import { pgTable, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shotsTable } from "./shots";
import { assetsTable } from "./assets";

export const storyboardFramesTable = pgTable("storyboard_frames", {
  id: serial("id").primaryKey(),
  shotId: integer("shot_id").references(() => shotsTable.id).notNull(),
  assetId: integer("asset_id").references(() => assetsTable.id),
  promptVersionId: integer("prompt_version_id"),
  isLockedReference: boolean("is_locked_reference").default(false),
  selectedVariantRank: integer("selected_variant_rank"),
});

export const insertStoryboardFrameSchema = createInsertSchema(storyboardFramesTable).omit({ id: true });
export type InsertStoryboardFrame = z.infer<typeof insertStoryboardFrameSchema>;
export type StoryboardFrame = typeof storyboardFramesTable.$inferSelect;
