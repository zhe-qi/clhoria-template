import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

import { systemRole } from "./role";
import { systemUser } from "./user";

export const systemUserRole = pgTable("system_user_role", {
  userId: uuid().notNull(),
  roleId: uuid().notNull(),
  domain: varchar({ length: 64 }).notNull().default("default"),
}, table => [
  primaryKey({ columns: [table.domain, table.userId, table.roleId] }),
]);

export const systemUserRoleRelations = relations(systemUserRole, ({ one }) => ({
  user: one(systemUser, {
    fields: [systemUserRole.userId],
    references: [systemUser.id],
  }),
  role: one(systemRole, {
    fields: [systemUserRole.roleId],
    references: [systemRole.id],
  }),
}));
