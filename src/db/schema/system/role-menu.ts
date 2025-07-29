import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

import { systemMenu } from "./menu";
import { systemRole } from "./role";

export const systemRoleMenu = pgTable("system_role_menu", {
  roleId: uuid().notNull(),
  menuId: uuid().notNull(),
  domain: varchar({ length: 64 }).notNull(),
}, table => [
  primaryKey({ columns: [table.roleId, table.menuId, table.domain] }),
]);

export const systemRoleMenuRelations = relations(systemRoleMenu, ({ one }) => ({
  role: one(systemRole, {
    fields: [systemRoleMenu.roleId],
    references: [systemRole.id],
  }),
  menu: one(systemMenu, {
    fields: [systemRoleMenu.menuId],
    references: [systemMenu.id],
  }),
}));
