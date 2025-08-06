import { z } from "@hono/zod-openapi";
import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

/** 系统全局参数表 */
export const systemGlobalParams = pgTable("system_global_params", {
  ...defaultColumns,
  key: varchar({ length: 100 }).notNull().unique(),
  value: text().notNull(),
  type: varchar({ length: 20 }).notNull().default("string"),
  description: text(),
  isPublic: integer("is_public").notNull().default(1),
  status: integer().notNull().default(1),
});

/** 系统全局参数选择模式 */
export const selectSystemGlobalParamsSchema = createSelectSchema(systemGlobalParams, {
  id: schema => schema.meta({ description: "参数ID" }),
  key: schema => schema.meta({ description: "参数键名" }),
  value: schema => schema.meta({ description: "参数值" }),
  type: schema => schema.meta({ description: "参数类型: string|number|boolean|json" }),
  description: schema => schema.meta({ description: "参数描述" }),
  isPublic: schema => schema.meta({ description: "是否公开: 1=公开 0=私有" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用" }),
  createdAt: schema => schema.meta({ description: "创建时间" }),
  updatedAt: schema => schema.meta({ description: "更新时间" }),
  createdBy: schema => schema.meta({ description: "创建者ID" }),
  updatedBy: schema => schema.meta({ description: "更新者ID" }),
});

/** 系统全局参数创建模式 */
export const insertSystemGlobalParamsSchema = createInsertSchema(systemGlobalParams, {
  key: schema => schema.min(1, "参数键名不能为空").max(100, "参数键名不能超过100字符"),
  value: schema => schema.min(1, "参数值不能为空"),
  type: schema => schema.default("string").refine(
    val => ["string", "number", "boolean", "json"].includes(val),
    { message: "参数类型必须是 string, number, boolean 或 json" },
  ),
  description: schema => schema.optional(),
  isPublic: schema => schema.default(1).refine(
    val => [0, 1].includes(val),
    { message: "isPublic 必须是 0 或 1" },
  ),
  status: schema => schema.default(1).refine(
    val => [0, 1].includes(val),
    { message: "状态必须是 0 或 1" },
  ),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

/** 系统全局参数更新模式 */
export const patchSystemGlobalParamsSchema = insertSystemGlobalParamsSchema.partial();

/** 响应用系统全局参数模式 */
export const responseSystemGlobalParamsSchema = selectSystemGlobalParamsSchema;

/** 批量获取参数请求模式 */
export const batchGetSysGlobalParamsSchema = z.object({
  keys: z.array(z.string().min(1)).min(1, "至少需要一个参数键").max(50, "一次最多获取50个参数"),
});

/** 参数类型枚举 */
export const SysGlobalParamType = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  JSON: "json",
} as const;

export type SysGlobalParamTypeType = (typeof SysGlobalParamType)[keyof typeof SysGlobalParamType];

// 为了保持向后兼容，保留旧的导出名称
export const globalParams = systemGlobalParams;
export const selectGlobalParamsSchema = selectSystemGlobalParamsSchema;
export const insertGlobalParamsSchema = insertSystemGlobalParamsSchema;
export const patchGlobalParamsSchema = patchSystemGlobalParamsSchema;
export const responseGlobalParamsSchema = responseSystemGlobalParamsSchema;
export const batchGetGlobalParamsSchema = batchGetSysGlobalParamsSchema;
export const GlobalParamType = SysGlobalParamType;
export type GlobalParamTypeType = SysGlobalParamTypeType;
