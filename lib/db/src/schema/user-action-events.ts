import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userActionEventsTable = pgTable("user_action_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  projectId: integer("project_id"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  actionType: text("action_type").notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserActionEventSchema = createInsertSchema(userActionEventsTable).omit({ id: true, createdAt: true });
export type InsertUserActionEvent = z.infer<typeof insertUserActionEventSchema>;
export type UserActionEvent = typeof userActionEventsTable.$inferSelect;
