import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

export const sysRoleMenu = pgTable("sys_role_menu", {
  roleId: uuid().notNull(),
  menuId: uuid().notNull(),
  domain: varchar({ length: 64 }).notNull(),
}, table => [
  primaryKey({ columns: [table.roleId, table.menuId, table.domain] }),
]);

export const sysRoleMenuRelations = relations(sysRoleMenu, () => ({
  // Relations will be defined in sys-role.ts and sys-menu.ts to avoid circular dependencies
}));
