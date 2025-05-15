import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

import { adminUsers } from "./admin-users";
import { roles } from "./roles";

export const usersToRoles = pgTable("user_to_roles", {
  userId: uuid().notNull().references(() => adminUsers.id),
  roleId: varchar({ length: 64 }).notNull().references(() => roles.id),
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);

export const usersToRolesRelations = relations(usersToRoles, ({ one }) => ({
  role: one(roles, {
    fields: [usersToRoles.roleId],
    references: [roles.id],
  }),
  user: one(adminUsers, {
    fields: [usersToRoles.userId],
    references: [adminUsers.id],
  }),
}));
