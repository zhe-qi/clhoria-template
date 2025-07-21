import { relations } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "./enums";
import { sysRoleMenu } from "./sys-role-menu";
import { sysUserRole } from "./sys-user-role";

export const sysRole = pgTable("sys_role", {
  ...defaultColumns,
  code: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 64 }).notNull(),
  description: text(),
  pid: varchar({ length: 64 }).notNull().default("0"),
  status: statusEnum().notNull().default("ENABLED"),
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
