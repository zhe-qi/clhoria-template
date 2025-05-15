import { pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const userRoles = pgTable("user_roles", {
  userId: uuid().notNull(),
  roleId: varchar({ length: 64 }).notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);

export const selectUserRolesSchema = createSelectSchema(userRoles);

export const insertUserRolesSchema = createInsertSchema(userRoles);

export const patchUserRolesSchema = insertUserRolesSchema.partial();
