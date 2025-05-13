import { index, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

export const roles = pgTable("roles", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  // 角色名称
  name: text().notNull(),
  // 角色描述
  description: text(),
  // 角色状态 0: 禁用 1: 启用
  status: integer().default(1),
  // 角色创建时间
  createdAt: defaultColumns.createdAt,
  // 角色更新时间
  updatedAt: defaultColumns.updatedAt,
}, table => [
  index("status_index").on(table.status),
]);

export const selectRolesSchema = createSelectSchema(roles);

export const insertRolesSchema = createInsertSchema(
  roles,
).omit({
  createdAt: true,
  updatedAt: true,
});

export const patchRolesSchema = insertRolesSchema.partial();
