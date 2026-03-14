import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vfxPlacementsTable = pgTable("vfx_placements", {
  id: serial("id").primaryKey(),
  shotId: integer("shot_id"),
  assetId: integer("asset_id"),
  effectType: text("effect_type").notNull(),
  parametersJson: jsonb("parameters_json"),
  placementJson: jsonb("placement_json"),
  timelineStartMs: integer("timeline_start_ms"),
  timelineEndMs: integer("timeline_end_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVfxPlacementSchema = createInsertSchema(vfxPlacementsTable).omit({ id: true, createdAt: true });
export type InsertVfxPlacement = z.infer<typeof insertVfxPlacementSchema>;
export type VfxPlacement = typeof vfxPlacementsTable.$inferSelect;
