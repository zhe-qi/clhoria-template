import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

import { adminRoles } from "./admin-roles";
import { adminUsers } from "./admin-users";

export const usersToRoles = pgTable("user_to_roles", {
  userId: uuid().notNull().references(() => adminUsers.id),
  roleId: varchar({ length: 64 }).notNull().references(() => adminRoles.id),
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);

export const usersToRolesRelations = relations(usersToRoles, ({ one }) => ({
  role: one(adminRoles, {
    fields: [usersToRoles.roleId],
    references: [adminRoles.id],
  }),
  user: one(adminUsers, {
    fields: [usersToRoles.userId],
    references: [adminUsers.id],
  }),
}));
