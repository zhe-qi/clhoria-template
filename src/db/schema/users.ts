import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns, baseColumnsOmit } from "@/db/common/base-columns";

export const users = pgTable("users", {
  id: baseColumns.id,
  username: text().notNull().unique(),
  password: text().notNull(),
  role: text().notNull().default("user"),
  createdAt: baseColumns.createdAt,
  updatedAt: baseColumns.updatedAt,
});

export const selectUsersSchema = createSelectSchema(users);

export const insertUsersSchema = createInsertSchema(
  users,
  {
    username: schema => schema.min(4).max(15).regex(/^\w+$/),
    password: schema => schema.min(6).max(20).regex(/^[\w!@#$%^&*()+\-=[\]{};':"\\|,.<>/?]+$/),
  },
).omit({
  ...baseColumnsOmit,
  role: true,
});

export const patchUsersSchema = insertUsersSchema.partial();
