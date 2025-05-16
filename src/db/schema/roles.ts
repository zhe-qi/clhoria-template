import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

import { usersToRoles } from "./users-to-roles";

export const roles = pgTable("roles", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: text().notNull(),
  description: text(),
  status: integer().default(1),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
}, table => [
  index("status_index").on(table.status),
]);

export const rolesRelations = relations(roles, ({ many }) => ({
  usersToRoles: many(usersToRoles),
}));

export const selectRolesSchema = createSelectSchema(
  roles,
  {
    id: schema => schema.openapi?.({
      description: "角色ID 例如: admin",
    }) ?? schema,
    name: schema => schema.openapi?.({
      description: "角色名称",
    }) ?? schema,
    description: schema => schema.openapi?.({
      description: "角色描述",
    }) ?? schema,
  },
);

export const insertRolesSchema = selectRolesSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export const patchRolesSchema = insertRolesSchema.partial();
