import { z } from "@hono/zod-openapi";
import { relations } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";
import { systemDomain } from "./domain";
import { systemRoleMenu } from "./role-menu";

export const menuTypeEnum = pgEnum("menu_type", ["directory", "menu"]);

export const systemMenu = pgTable("system_menu", {
  ...defaultColumns,
  menuType: menuTypeEnum().notNull(),
  menuName: varchar({ length: 64 }).notNull(),
  iconType: integer().default(1),
  icon: varchar({ length: 64 }),
  routeName: varchar({ length: 64 }).notNull(),
  routePath: varchar({ length: 128 }).notNull(),
  component: varchar({ length: 64 }).notNull(),
  pathParam: varchar({ length: 64 }),
  status: statusEnum().notNull(),
  activeMenu: varchar({ length: 64 }),
  hideInMenu: boolean().default(false),
  pid: uuid(),
  order: integer().notNull(),
  i18nKey: varchar({ length: 64 }),
  keepAlive: boolean().default(false),
  constant: boolean().notNull().default(false),
  href: varchar({ length: 64 }),
  multiTab: boolean().default(false),
  domain: varchar({ length: 64 }).notNull().default("default"),
});

export const systemMenuRelations = relations(systemMenu, ({ many, one }) => ({
  roleMenus: many(systemRoleMenu),
  domain: one(systemDomain, {
    fields: [systemMenu.domain],
    references: [systemDomain.code],
  }),
}));

export const selectSystemMenuSchema = createSelectSchema(systemMenu, {
  id: schema => schema.describe("菜单ID"),
  menuType: schema => schema.describe("菜单类型: directory=目录 menu=菜单"),
  menuName: schema => schema.describe("菜单名称"),
  iconType: schema => schema.describe("图标类型"),
  icon: schema => schema.describe("图标"),
  routeName: schema => schema.describe("路由名称"),
  routePath: schema => schema.describe("路由路径"),
  component: schema => schema.describe("组件路径"),
  pathParam: schema => schema.describe("路径参数"),
  status: schema => schema.describe("状态: 1=启用 0=禁用"),
  activeMenu: schema => schema.describe("激活的菜单"),
  hideInMenu: schema => schema.describe("是否在菜单中隐藏"),
  pid: schema => schema.describe("父级菜单ID"),
  order: schema => schema.describe("排序"),
  i18nKey: schema => schema.describe("国际化键"),
  keepAlive: schema => schema.describe("是否缓存"),
  constant: schema => schema.describe("是否常量菜单"),
  href: schema => schema.describe("外链地址"),
  multiTab: schema => schema.describe("是否多标签"),
  domain: schema => schema.describe("所属域"),
});

export const insertSystemMenuSchema = createInsertSchema(systemMenu, {
  menuName: schema => schema.min(1),
  routeName: schema => schema.min(1),
  routePath: schema => schema.min(1),
  component: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchSystemMenuSchema = insertSystemMenuSchema.partial();

// 菜单树Schema - 与服务层 TreeNode<T> 类型匹配
export const menuTreeSchema = selectSystemMenuSchema.extend({
  children: z.unknown().optional(),
}).passthrough();

// 用户路由响应Schema（适用于 sys-menus 模块）
export const userRoutesSchema = z.object({
  routes: z.array(menuTreeSchema),
  home: z.string().describe("首页路由"),
});
