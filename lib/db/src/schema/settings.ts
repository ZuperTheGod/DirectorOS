import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Setting = typeof settingsTable.$inferSelect;
