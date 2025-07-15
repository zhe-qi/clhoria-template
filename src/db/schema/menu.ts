import { z } from "@hono/zod-openapi";
import { integer, jsonb, pgTable, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

export const menu = pgTable("menu", {
  id: defaultColumns.id,
  component: varchar({ length: 255 }),
  meta: jsonb().$type<{
    title?: string | undefined;
    icon?: string | undefined;
    hidden?: boolean | undefined;
    keepAlive?: boolean | undefined;
    order?: number | undefined;
    redirect?: string | undefined;
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
    component: schema => schema.describe("组件地址"),
    meta: () => {
      const schema = z.object({
        title: z.string().optional().describe("菜单名称"),
        icon: z.string().optional().describe("菜单图标"),
        hidden: z.boolean().describe("是否隐藏").default(false).optional(),
        keepAlive: z.boolean().describe("是否缓存").default(true).optional(),
        order: z.number().describe("权重排序").default(0).optional(),
        redirect: z.string().optional().describe("重定向地址"),
      }).optional();
      return schema.describe("菜单元数据");
    },
    resource: schema => schema.describe("资源地址"),
    action: schema => schema.describe("操作类型"),
    /**  0: 目录 1: 菜单 2: 按钮  */
    type: schema => schema.describe(JSON.stringify({
      title: "菜单类型",
      dict: "menuType",
    })),
    parentId: schema => schema.describe("父级ID"),
  },
).describe(JSON.stringify({
  title: "菜单",
  name: "menu",
}));

export const insertMenuSchema = selectMenuSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchMenuSchema = insertMenuSchema.partial();
