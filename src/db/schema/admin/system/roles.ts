import { relations } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { Status } from "@/lib/enums";

import { statusEnum } from "../../_shard/enums";
import { systemUserRoles } from "./user-roles";

export const systemRoles = pgTable("system_roles", {
  ...baseColumns,
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: varchar({ length: 64 }).notNull(),
  description: text(),
  status: statusEnum().default(Status.ENABLED).notNull(),
});

export const systemRolesRelations = relations(systemRoles, ({ many }) => ({
  systemUserRoles: many(systemUserRoles),
}));

export const selectSystemRolesSchema = createSelectSchema(systemRoles, {
  id: schema => schema.meta({ description: "角色ID" }),
  name: schema => schema.meta({ description: "角色名称" }),
  description: schema => schema.meta({ description: "角色描述" }),
  status: schema => schema.meta({ description: "状态 (ENABLED=启用, DISABLED=禁用)" }),
});

export const insertSystemRolesSchema = createInsertSchema(systemRoles, {
  id: schema => schema.min(1).regex(/^[a-z0-9_]+$/),
  name: schema => schema.min(1),
}).omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});
