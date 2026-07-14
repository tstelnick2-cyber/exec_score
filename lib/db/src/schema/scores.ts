import { pgTable, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoresTable = pgTable("scores", {
  id: text("id").primaryKey(),
  linkedin_url: text("linkedin_url").notNull(),
  status: text("status").notNull().default("pending"), // pending | processing | complete | error
  overall_score: integer("overall_score"),
  percentile: integer("percentile"),
  archetype: text("archetype"),
  archetype_description: text("archetype_description"),
  categories: jsonb("categories"),
  email_verified: boolean("email_verified").notNull().default(false),
  verified_email: text("verified_email"),
  error_message: text("error_message"),
  raw_data: jsonb("raw_data"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertScoreSchema = createInsertSchema(scoresTable).omit({
  created_at: true,
});

export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scoresTable.$inferSelect;
