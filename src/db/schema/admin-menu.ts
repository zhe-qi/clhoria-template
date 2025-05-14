import { boolean, integer, jsonb, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

// 菜单类型枚举 目录/菜单/按钮
export const menuTypeEnum = pgEnum("type", ["dir", "menu", "button"]);

export const adminMenu = pgTable("admin_menu", {
  id: defaultColumns.id,
  /** 菜单组件 */
  component: varchar({ length: 255 }).notNull(),
  /** 菜单元数据 */
  meta: jsonb().$type<{
    /** 菜单名称 */
    title: string;
    /** 菜单图标 */
    icon: string;
    /** 是否隐藏 */
    hidden: boolean;
    /** 是否缓存 */
    keepAlive: boolean;
    /** 权重排序 */
    order: number;
    /** 重定向地址 */
    redirect: string;
  }>(),
  /** 仅按钮生效，对应 casbin 规则表的 id（uuid） */
  casbinId: uuid(),
  /** 目录或菜单或按钮类型：dir/menu/button */
  type: menuTypeEnum().notNull(),
  /** 父级菜单ID */
  parentId: uuid(),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
});

export const selectAdminMenuSchema = createSelectSchema(adminMenu);

export const insertAdminMenuSchema = createInsertSchema(
  adminMenu,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchAdminMenuSchema = insertAdminMenuSchema.partial();
