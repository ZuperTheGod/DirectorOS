import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assetsTable } from "./assets";

export const assetVersionsTable = pgTable("asset_versions", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").references(() => assetsTable.id).notNull(),
  parentVersionId: integer("parent_version_id"),
  sourceType: text("source_type"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssetVersionSchema = createInsertSchema(assetVersionsTable).omit({ id: true, createdAt: true });
export type InsertAssetVersion = z.infer<typeof insertAssetVersionSchema>;
export type AssetVersion = typeof assetVersionsTable.$inferSelect;
