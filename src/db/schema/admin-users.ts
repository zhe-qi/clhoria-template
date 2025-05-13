import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

export const adminUsers = pgTable("admin_users", {
  id: defaultColumns.id,
  username: text().notNull().unique(),
  password: text().notNull(),
  roles: varchar({ length: 64 }).array(),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
});

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
