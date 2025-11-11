import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

import { systemRoles } from "./roles";
import { systemUsers } from "./users";

export const systemUserRoles = pgTable("system_user_roles", {
  userId: uuid().notNull().references(() => systemUsers.id, { onDelete: "cascade" }),
  roleId: varchar({ length: 64 }).notNull().references(() => systemRoles.id, { onDelete: "cascade" }),
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
  index("idx_user_roles_user_id").on(table.userId),
  index("idx_user_roles_role_id").on(table.roleId),
]);

export const systemUserRolesRelations = relations(systemUserRoles, ({ one }) => ({
  user: one(systemUsers, {
    fields: [systemUserRoles.userId],
    references: [systemUsers.id],
  }),
  roles: one(systemRoles, {
    fields: [systemUserRoles.roleId],
    references: [systemRoles.id],
  }),
}));
