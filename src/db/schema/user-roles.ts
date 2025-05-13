import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";

import { adminUsers, roles } from "@/db/schema";

export const userRoles = pgTable("user_roles", {
  userId: uuid().references(() => adminUsers.id, { onDelete: "cascade" }),
  roleId: varchar({ length: 64 }).references(() => roles.id, { onDelete: "cascade" }),
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);
