import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

import { systemRoles } from "./roles";
import { systemUsers } from "./users";

export const systemUserRoles = pgTable("system_user_roles", {
  userId: uuid().notNull(),
  roleId: varchar({ length: 64 }).notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
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
