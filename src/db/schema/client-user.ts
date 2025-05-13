import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

export const clientUsers = pgTable("client_users", {
  id: defaultColumns.id,
  username: text().notNull().unique(),
  password: text().notNull(),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
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
