import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { withBaseSchema, withBaseSchemaOmit } from "@/db/common/base-schema";

export const tasks = pgTable("tasks", {
  ...withBaseSchema(),
  name: text().notNull(),
  done: boolean().notNull().default(false),
});

export const selectTasksSchema = createSelectSchema(tasks);

export const insertTasksSchema = createInsertSchema(
  tasks,
  {
    name: schema => schema.min(1).max(500),
  },
).required({
  done: true,
}).omit(withBaseSchemaOmit());

export const patchTasksSchema = insertTasksSchema.partial();
