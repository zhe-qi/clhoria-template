import { pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

// 菜单类型枚举 目录/菜单/按钮
export const menuTypeEnum = pgEnum("type", ["dir", "menu", "button"]);

// 创建菜单表
export const menuTable = pgTable("menu", {
  id: defaultColumns.id,
  // 前端路由地址
  path: varchar({ length: 100 }).notNull(),
  // 菜单名称
  name: varchar({ length: 50 }).notNull(),
  // 菜单类型：目录/菜单/按钮
  type: menuTypeEnum().notNull(),
  // 父级菜单ID
  parentId: uuid(),
  // HTTP方法
  method: varchar({ length: 10 }).default(""),
  // 图标
  icon: varchar({ length: 50 }),
  // 创建时间
  createdAt: defaultColumns.createdAt,
  // 更新时间
  updatedAt: defaultColumns.updatedAt,
});

export const selectMenuTableSchema = createSelectSchema(menuTable);

export const insertMenuTableSchema = createInsertSchema(
  menuTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchMenuTableSchema = insertMenuTableSchema.partial();
