import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns, baseColumnsOmit } from "@/db/common/base-columns";

export const tasks = pgTable("tasks", {
  id: baseColumns.id,
  name: text().notNull(),
  done: boolean().notNull().default(false),
  createdAt: baseColumns.createdAt,
  updatedAt: baseColumns.updatedAt,
});

export const selectTasksSchema = createSelectSchema(tasks);

export const insertTasksSchema = createInsertSchema(
  tasks,
  {
    name: schema => schema.min(1).max(500),
  },
).required({
  done: true,
}).omit(baseColumnsOmit);

export const patchTasksSchema = insertTasksSchema.partial();
