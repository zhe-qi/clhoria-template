import { relations } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "./enums";
import { sysRoleMenu } from "./sys-role-menu";
import { sysUserRole } from "./sys-user-role";

export const sysRole = pgTable("sys_role", {
  id: defaultColumns.id,
  code: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 64 }).notNull(),
  description: text(),
  pid: varchar({ length: 64 }).notNull().default("0"),
  status: statusEnum().notNull().default("ENABLED"),
  createdAt: defaultColumns.createdAt,
  createdBy: varchar("created_by", { length: 64 }).notNull(),
  updatedAt: defaultColumns.updatedAt,
  updatedBy: varchar("updated_by", { length: 64 }),
});

export const sysRoleRelations = relations(sysRole, ({ many }) => ({
  userRoles: many(sysUserRole),
  roleMenus: many(sysRoleMenu),
}));

export const selectSysRoleSchema = createSelectSchema(sysRole, {
  id: schema => schema.describe("角色ID"),
  code: schema => schema.describe("角色代码 例如: ROLE_ADMIN"),
  name: schema => schema.describe("角色名称"),
  description: schema => schema.describe("角色描述"),
  pid: schema => schema.describe("父角色ID"),
  status: schema => schema.describe("状态: ENABLED=启用 DISABLED=禁用"),
  createdAt: schema => schema.describe("创建时间"),
  createdBy: schema => schema.describe("创建人"),
  updatedAt: schema => schema.describe("更新时间"),
  updatedBy: schema => schema.describe("更新人"),
});

export const insertSysRoleSchema = createInsertSchema(sysRole, {
  code: schema => schema.min(1).regex(/^[A-Z_]+$/),
  name: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchSysRoleSchema = insertSysRoleSchema.partial();
