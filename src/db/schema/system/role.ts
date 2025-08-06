import { relations } from "drizzle-orm";
import { pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";
import { systemRoleMenu } from "./role-menu";
import { systemUserRole } from "./user-role";

export const systemRole = pgTable("system_role", {
  ...defaultColumns,
  code: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 64 }).notNull(),
  description: text(),
  pid: uuid(),
  status: statusEnum().notNull(),
});

export const systemRoleRelations = relations(systemRole, ({ many }) => ({
  userRoles: many(systemUserRole),
  roleMenus: many(systemRoleMenu),
}));

export const selectSystemRoleSchema = createSelectSchema(systemRole, {
  id: schema => schema.meta({ description: "角色ID" }),
  code: schema => schema.meta({ description: "角色代码 例如: ROLE_ADMIN" }),
  name: schema => schema.meta({ description: "角色名称" }),
  description: schema => schema.meta({ description: "角色描述" }),
  pid: schema => schema.meta({ description: "父角色ID" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用" }),
});

export const insertSystemRoleSchema = createInsertSchema(systemRole, {
  code: schema => schema.min(1).regex(/^[A-Z_]+$/),
  name: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchSystemRoleSchema = insertSystemRoleSchema.partial();
