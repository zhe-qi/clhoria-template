import { boolean, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

/** 任务处理器注册表 */
export const systemJobHandlers = pgTable("system_job_handlers", {
  ...defaultColumns,
  /** 处理函数名 */
  name: varchar({ length: 128 }).notNull(),
  /** 函数描述 */
  description: text(),
  /** 文件路径 */
  filePath: varchar({ length: 512 }),
  /** 是否激活 */
  isActive: boolean().default(true).notNull(),
});

export const selectSystemJobHandlersSchema = createSelectSchema(systemJobHandlers, {
  id: schema => schema.meta({ description: "处理器ID" }),
  name: schema => schema.meta({ description: "处理函数名" }),
  description: schema => schema.meta({ description: "函数描述" }),
  filePath: schema => schema.meta({ description: "文件路径" }),
  isActive: schema => schema.meta({ description: "是否激活" }),
});

export const insertSystemJobHandlersSchema = createInsertSchema(systemJobHandlers, {
  name: schema => schema.meta({ description: "处理函数名" }),
  description: schema => schema.meta({ description: "函数描述" }).optional(),
  filePath: schema => schema.meta({ description: "文件路径" }).optional(),
  isActive: schema => schema.meta({ description: "是否激活" }).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const patchSystemJobHandlersSchema = insertSystemJobHandlersSchema.partial();
