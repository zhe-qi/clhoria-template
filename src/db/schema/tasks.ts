import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

export const tasks = pgTable("tasks", {
  id: defaultColumns.id,
  name: text().notNull(),
  done: boolean().notNull().default(false),
  createdAt: defaultColumns.createdAt,
  updatedAt: defaultColumns.updatedAt,
});

export const selectTasksSchema = createSelectSchema(tasks);

export const insertTasksSchema = createInsertSchema(
  tasks,
  {
    name: schema => schema.min(1).max(500),
  },
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchTasksSchema = insertTasksSchema.partial();
