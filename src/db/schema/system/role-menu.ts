import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

export const systemRoleMenu = pgTable("system_role_menu", {
  roleId: uuid().notNull(),
  menuId: uuid().notNull(),
  domain: varchar({ length: 64 }).notNull(),
}, table => [
  primaryKey({ columns: [table.roleId, table.menuId, table.domain] }),
]);

export const systemRoleMenuRelations = relations(systemRoleMenu, () => ({
  // Relations will be defined in system-role.ts and system-menu.ts to avoid circular dependencies
}));
