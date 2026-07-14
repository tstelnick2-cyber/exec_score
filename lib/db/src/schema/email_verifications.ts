import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailVerificationsTable = pgTable("email_verifications", {
  id: text("id").primaryKey(),
  score_id: text("score_id").notNull(),
  email: text("email").notNull(),
  otp_code: text("otp_code").notNull(),
  verified: boolean("verified").notNull().default(false),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailVerificationSchema = createInsertSchema(
  emailVerificationsTable,
).omit({ created_at: true });

export type InsertEmailVerification = z.infer<typeof insertEmailVerificationSchema>;
export type EmailVerification = typeof emailVerificationsTable.$inferSelect;
