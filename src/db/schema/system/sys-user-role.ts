import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { sysRole } from "./sys-role";
import { sysUser } from "./sys-user";

export const sysUserRole = pgTable("sys_user_role", {
  userId: uuid().notNull(),
  roleId: uuid().notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);

export const sysUserRoleRelations = relations(sysUserRole, ({ one }) => ({
  user: one(sysUser, {
    fields: [sysUserRole.userId],
    references: [sysUser.id],
  }),
  role: one(sysRole, {
    fields: [sysUserRole.roleId],
    references: [sysRole.id],
  }),
}));
