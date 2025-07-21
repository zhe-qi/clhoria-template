import { boolean, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

export const apiKey = pgTable("api_key", {
  id: defaultColumns.id,
  /** API Key 名称 */
  name: varchar({ length: 100 }).notNull(),
  /** API Key 值 */
  key: varchar({ length: 64 }).notNull().unique(),
  /** 描述 */
  description: text(),
  /** 是否启用 */
  enabled: boolean().default(true).notNull(),
  /** 过期时间 */
  expiresAt: timestamp(),
  /** 最后使用时间 */
  lastUsedAt: timestamp(),
  /** 创建者 */
  createdBy: varchar({ length: 64 }).notNull(),
  /** 创建时间 */
  createdAt: defaultColumns.createdAt,
  /** 更新时间 */
  updatedAt: defaultColumns.updatedAt,
});

export const selectApiKeySchema = createSelectSchema(apiKey, {
  id: schema => schema.describe("API Key ID"),
  name: schema => schema.describe("API Key 名称"),
  key: schema => schema.describe("API Key 值"),
  description: schema => schema.describe("描述"),
  enabled: schema => schema.describe("是否启用"),
  expiresAt: schema => schema.describe("过期时间"),
  lastUsedAt: schema => schema.describe("最后使用时间"),
  createdBy: schema => schema.describe("创建者ID"),
  createdAt: schema => schema.describe("创建时间"),
  updatedAt: schema => schema.describe("更新时间"),
});

export const insertApiKeySchema = createInsertSchema(apiKey).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});

export const patchApiKeySchema = insertApiKeySchema.partial();
