import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { withBaseSchema, withBaseSchemaOmit } from "@/db/common/base-schema";

export const users = pgTable("users", {
  ...withBaseSchema(),
  username: text().notNull().unique(),
  password: text().notNull(),
  role: text().notNull().default("user"),
});

export const selectUsersSchema = createSelectSchema(users);

export const insertUsersSchema = createInsertSchema(
  users,
  {
    username: schema => schema.min(4).max(15).regex(/^\w+$/),
    password: schema => schema.min(6).max(20).regex(/^[\w!@#$%^&*()+\-=[\]{};':"\\|,.<>/?]+$/),
  },
).omit({
  ...withBaseSchemaOmit(),
  role: true,
});

export const patchUsersSchema = insertUsersSchema.partial();
