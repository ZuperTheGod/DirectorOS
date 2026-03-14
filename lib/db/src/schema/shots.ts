import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scenesTable } from "./scenes";

export const shotsTable = pgTable("shots", {
  id: serial("id").primaryKey(),
  sceneId: integer("scene_id").references(() => scenesTable.id).notNull(),
  orderIndex: integer("order_index").notNull(),
  shotType: text("shot_type"),
  durationMs: integer("duration_ms"),
  promptSummary: text("prompt_summary"),
  cameraIntentJson: jsonb("camera_intent_json"),
  motionIntentJson: jsonb("motion_intent_json"),
  status: text("status").notNull().default("empty"),
  thumbnailUri: text("thumbnail_uri"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShotSchema = createInsertSchema(shotsTable).omit({ id: true, createdAt: true });
export type InsertShot = z.infer<typeof insertShotSchema>;
export type Shot = typeof shotsTable.$inferSelect;
