import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

export const clientUsers = pgTable("client_users", {
  ...defaultColumns,
  /** 用户名 */
  username: text().notNull().unique(),
  /** 密码 */
  password: text().notNull(),
});

export const selectClientUsersSchema = createSelectSchema(clientUsers);

export const insertClientUsersSchema = createInsertSchema(
  clientUsers,
  {
    username: schema => schema.min(4).max(15).regex(/^\w+$/),
    password: schema => schema.min(6).max(20).regex(/^[\w!@#$%^&*()+\-=[\]{};':"\\|,.<>/?]+$/),
  },
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchClientUsersSchema = insertClientUsersSchema.partial();
