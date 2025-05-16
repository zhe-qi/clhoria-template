import { z } from "@hono/zod-openapi";
import { integer, jsonb, pgTable, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

export const menu = pgTable("menu", {
  id: defaultColumns.id,
  component: varchar({ length: 255 }),
  meta: jsonb().$type<{
    title?: string;
    icon?: string;
    hidden?: boolean;
    keepAlive?: boolean;
    order?: number;
    redirect?: string;
  }>(),
  resource: varchar({ length: 255 }),
  action: varchar({ length: 64 }),
  type: integer().notNull(),
  parentId: varchar({ length: 64 }),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
});

export const selectMenuSchema = createSelectSchema(
  menu,
  {
    component: schema => schema.openapi({
      description: "组件地址",
    }) ?? schema,
    meta: () => {
      const schema = z.object({
        title: z.string().optional().describe("菜单名称"),
        icon: z.string().optional().describe("菜单图标"),
        hidden: z.boolean().optional().describe("是否隐藏").default(false),
        keepAlive: z.boolean().optional().describe("是否缓存").default(true),
        order: z.number().optional().describe("权重排序").default(0),
        redirect: z.string().optional().describe("重定向地址"),
      }).optional();
      return schema.openapi?.({
        description: "菜单元数据",
      }) ?? schema;
    },
    resource: schema => schema.openapi?.({
      description: "资源地址",
    }) ?? schema,
    action: schema => schema.openapi?.({
      description: "操作类型",
    }) ?? schema,
    type: schema => schema.openapi?.({
      description: "菜单类型 0: 目录 1: 菜单 2: 按钮",
    }) ?? schema,
  },
);

export const insertMenuSchema = selectMenuSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchMenuSchema = insertMenuSchema.partial();
