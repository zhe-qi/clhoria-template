import { relations } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";
import { systemUserRole } from "./user-role";

export const systemRole = pgTable("system_role", {
  ...defaultColumns,
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: varchar({ length: 64 }).notNull(),
  description: text(),
  status: statusEnum().notNull(),
});

export const systemRoleRelations = relations(systemRole, ({ many }) => ({
  userRoles: many(systemUserRole),
}));

export const selectSystemRoleSchema = createSelectSchema(systemRole, {
  id: schema => schema.meta({ description: "角色ID" }),
  name: schema => schema.meta({ description: "角色名称" }),
  description: schema => schema.meta({ description: "角色描述" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用" }),
});

export const insertSystemRoleSchema = createInsertSchema(systemRole, {
  id: schema => schema.min(1).regex(/^[a-z_]+$/),
  name: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
});

export const patchSystemRoleSchema = insertSystemRoleSchema.partial();

// id 查询 schema
export const idSystemRoleSchema = z.object({
  id: z.string().min(1).regex(/^[a-z_]+$/).meta({ description: "角色ID" }),
});
