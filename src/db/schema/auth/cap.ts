import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

/** Cap.js 验证码挑战表 */
export const capChallenges = pgTable("cap_challenges", {
  id: defaultColumns.id,
  token: text().notNull().unique(),
  data: text().notNull(),
  expires: timestamp({ mode: "string" }).notNull(),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
}, table => [
  index("cap_challenges_token_expires_idx").on(table.token, table.expires),
  index("cap_challenges_expires_idx").on(table.expires),
]);

/** Cap.js 验证token表 */
export const capTokens = pgTable("cap_tokens", {
  id: defaultColumns.id,
  key: text().notNull().unique(),
  expires: timestamp({ mode: "string" }).notNull(),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
}, table => [
  index("cap_tokens_key_expires_idx").on(table.key, table.expires),
  index("cap_tokens_expires_idx").on(table.expires),
]);

// Schema definitions
export const selectCapChallengeSchema = createSelectSchema(capChallenges);
export const insertCapChallengeSchema = createInsertSchema(capChallenges);
export const patchCapChallengeSchema = insertCapChallengeSchema.partial();

export const selectCapTokenSchema = createSelectSchema(capTokens);
export const insertCapTokenSchema = createInsertSchema(capTokens);
export const patchCapTokenSchema = insertCapTokenSchema.partial();

export type SelectCapChallengeData = typeof capChallenges.$inferSelect;
export type InsertCapChallengeData = typeof capChallenges.$inferInsert;

export type SelectCapTokenData = typeof capTokens.$inferSelect;
export type InsertCapTokenData = typeof capTokens.$inferInsert;
