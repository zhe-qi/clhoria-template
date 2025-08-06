import type { z } from "@hono/zod-openapi";

import { relations } from "drizzle-orm";
import { jsonb, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import type { routeMetaSchema } from "./authorization";

import { statusEnum } from "../../common/enums";
import { systemDomain } from "./domain";
import { systemRoleMenu } from "./role-menu";

type RouteMeta = z.infer<typeof routeMetaSchema>;

export const systemMenu = pgTable("system_menu", {
  ...defaultColumns,
  // 菜单类型通过 component 字段判断：component 为 null 表示目录，非 null 表示菜单页面
  name: varchar({ length: 64 }).notNull(),
  path: varchar({ length: 128 }).notNull(),
  component: varchar({ length: 128 }),
  redirect: varchar({ length: 500 }),
  status: statusEnum().notNull(),
  pid: uuid(),
  meta: jsonb().$type<RouteMeta>().default({ title: "", order: 0 } as RouteMeta),
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
  id: schema => schema.meta({ description: "菜单ID" }),
  name: schema => schema.meta({ description: "路由名称" }),
  path: schema => schema.meta({ description: "路由路径" }),
  component: schema => schema.meta({ description: "组件路径" }),
  redirect: schema => schema.meta({ description: "重定向路径" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用" }),
  pid: schema => schema.meta({ description: "父级菜单ID" }),
  meta: schema => schema.meta({ description: "路由Meta属性" }),
  domain: schema => schema.meta({ description: "所属域" }),
});

export const insertSystemMenuSchema = createInsertSchema(systemMenu, {
  name: schema => schema.min(1).meta({ description: "路由名称" }),
  path: schema => schema.min(1).meta({ description: "路由路径" }),
  component: schema => schema.nullable().optional().meta({ description: "组件路径" }),
  redirect: schema => schema.nullable().optional().meta({ description: "重定向路径" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用" }),
  pid: schema => schema.nullable().optional().meta({ description: "父级菜单ID" }),
  meta: schema => schema.meta({ description: "路由Meta属性" }),
  domain: schema => schema.meta({ description: "所属域" }),
});

export const patchSystemMenuSchema = createInsertSchema(systemMenu, {
  name: schema => schema.min(1).optional().meta({ description: "路由名称" }),
  path: schema => schema.min(1).optional().meta({ description: "路由路径" }),
  component: schema => schema.nullable().optional().meta({ description: "组件路径" }),
  redirect: schema => schema.nullable().optional().meta({ description: "重定向路径" }),
  status: schema => schema.optional().meta({ description: "状态: 1=启用 0=禁用" }),
  pid: schema => schema.nullable().optional().meta({ description: "父级菜单ID" }),
  meta: schema => schema.optional().meta({ description: "路由Meta属性" }),
  domain: schema => schema.optional().meta({ description: "所属域" }),
}).partial();
