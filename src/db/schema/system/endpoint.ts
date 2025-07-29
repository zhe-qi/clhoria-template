import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

export const systemEndpoint = pgTable("system_endpoint", {
  ...defaultColumns,
  path: varchar({ length: 255 }).notNull(),
  method: varchar({ length: 16 }).notNull(),
  action: varchar({ length: 64 }).notNull(),
  resource: varchar({ length: 128 }).notNull(),
  controller: varchar({ length: 128 }).notNull(),
  summary: text(),
});

export const selectSysEndpointSchema = createSelectSchema(systemEndpoint, {
  id: schema => schema.describe("端点ID"),
  path: schema => schema.describe("路径"),
  method: schema => schema.describe("HTTP方法"),
  action: schema => schema.describe("动作"),
  resource: schema => schema.describe("资源"),
  controller: schema => schema.describe("控制器"),
  summary: schema => schema.describe("描述"),
});

export const insertSysEndpointSchema = createInsertSchema(systemEndpoint, {
  path: schema => schema.min(1),
  method: schema => schema.regex(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/),
  action: schema => schema.min(1),
  resource: schema => schema.min(1),
  controller: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchSysEndpointSchema = insertSysEndpointSchema.partial();
