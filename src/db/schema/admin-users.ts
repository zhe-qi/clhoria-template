import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { usersToRoles } from "./users-to-roles";

export const adminUsers = pgTable("admin_users", {
  id: defaultColumns.id,
  /** 用户名 */
  username: text().notNull().unique(),
  /** 密码 */
  password: text().notNull(),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
});

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  usersToRoles: many(usersToRoles),
}));

export const selectAdminUsersSchema = createSelectSchema(adminUsers);

export const insertAdminUsersSchema = createInsertSchema(
  adminUsers,
  {
    username: schema => schema.min(4).max(15).regex(/^\w+$/),
    password: schema => schema.min(6).max(20).regex(/^[\w!@#$%^&*()+\-=[\]{};':"\\|,.<>/?]+$/),
  },
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchAdminUsersSchema = insertAdminUsersSchema.partial();
