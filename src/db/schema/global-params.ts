import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { defaultColumns } from "@/db/common/default-columns";

/** 全局参数表 */
export const globalParams = pgTable("global_params", {
  ...defaultColumns,
  key: varchar({ length: 100 }).notNull().unique(),
  value: text().notNull(),
  type: varchar({ length: 20 }).notNull().default("string"),
  description: text(),
  isPublic: integer("is_public").notNull().default(1),
  status: integer().notNull().default(1),
  domain: varchar({ length: 50 }).notNull(),
});

/** 全局参数选择模式 */
export const selectGlobalParamsSchema = createSelectSchema(globalParams, {
  id: schema => schema.describe("参数ID"),
  key: schema => schema.describe("参数键名"),
  value: schema => schema.describe("参数值"),
  type: schema => schema.describe("参数类型: string|number|boolean|json"),
  description: schema => schema.describe("参数描述"),
  isPublic: schema => schema.describe("是否公开: 1=公开 0=私有"),
  status: schema => schema.describe("状态: 1=启用 0=禁用"),
  domain: schema => schema.describe("租户域"),
  createdAt: schema => schema.describe("创建时间"),
  updatedAt: schema => schema.describe("更新时间"),
  createdBy: schema => schema.describe("创建者ID"),
  updatedBy: schema => schema.describe("更新者ID"),
});

/** 全局参数创建模式 */
export const insertGlobalParamsSchema = createInsertSchema(globalParams, {
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
  domain: true, // 域会在业务逻辑中自动设置
});

/** 全局参数更新模式 */
export const patchGlobalParamsSchema = insertGlobalParamsSchema.partial();

/** 响应用全局参数模式 */
export const responseGlobalParamsSchema = selectGlobalParamsSchema;

/** 批量获取参数请求模式 */
export const batchGetGlobalParamsSchema = z.object({
  keys: z.array(z.string().min(1)).min(1, "至少需要一个参数键").max(50, "一次最多获取50个参数"),
});

/** 参数类型枚举 */
export const GlobalParamType = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  JSON: "json",
} as const;

export type GlobalParamTypeType = (typeof GlobalParamType)[keyof typeof GlobalParamType];
