import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

import { adminSystemRole } from "./role";
import { adminSystemUser } from "./user";

export const adminSystemUserRole = pgTable("admin_system_user_role", {
  userId: uuid().notNull(),
  roleId: varchar({ length: 64 }).notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);

export const adminSystemUserRoleRelations = relations(adminSystemUserRole, ({ one }) => ({
  user: one(adminSystemUser, {
    fields: [adminSystemUserRole.userId],
    references: [adminSystemUser.id],
  }),
  role: one(adminSystemRole, {
    fields: [adminSystemUserRole.roleId],
    references: [adminSystemRole.id],
  }),
}));
