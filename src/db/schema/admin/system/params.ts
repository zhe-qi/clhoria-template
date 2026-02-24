import { index, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { paramValueTypeEnum, statusEnum } from "@/db/schema/_shard/enums";
import { ParamValueType, Status } from "@/lib/enums";
import { StatusDescriptions } from "@/lib/schemas";

/**
 * System parameters table
 * Used for dynamic configuration of various system parameters (e.g., SMS signature, payment config, system switches)
 * 系统参数表
 * 用于动态配置各种系统参数（如短信签名、支付配置、系统开关等）
 */
export const systemParams = pgTable("system_params", {
  ...baseColumns,
  /** Parameter key (unique identifier, e.g., "sms_sign") / 参数键（唯一标识，如 "sms_sign"） */
  key: varchar({ length: 128 }).notNull().unique(),
  /** Parameter value (stored as string) / 参数值（字符串存储） */
  value: text().notNull(),
  /** Parameter value type (for frontend parsing) / 参数值类型（供前端解析） */
  valueType: paramValueTypeEnum().default(ParamValueType.STRING).notNull(),
  /** Parameter name (e.g., "SMS signature") / 参数名称（如 "短信签名"） */
  name: varchar({ length: 128 }).notNull(),
  /** Parameter description / 参数描述 */
  description: text(),
  /** Enabled/disabled status / 启用/禁用状态 */
  status: statusEnum().default(Status.ENABLED).notNull(),
}, table => [
  // Unique constraint on key field already includes an index / key 字段的唯一约束已经包含了索引
  // Add index on status field for querying enabled parameters / 为 status 字段添加索引，用于查询启用的参数
  index("system_params_status_idx").on(table.status),
]);

/**
 * Select Schema (used for queries)
 * Select Schema（查询时使用）
 */
export const selectSystemParamsSchema = createSelectSchema(systemParams, {
  id: schema => schema.meta({ description: "参数ID" }),
  key: schema => schema.meta({ description: "参数键" }),
  value: schema => schema.meta({ description: "参数值" }),
  valueType: schema => schema.meta({ description: "参数值类型 (STRING=字符串, NUMBER=数字, BOOLEAN=布尔值, JSON=JSON对象)" }),
  name: schema => schema.meta({ description: "参数名称" }),
  description: schema => schema.meta({ description: "参数描述" }),
  status: schema => schema.meta({ description: StatusDescriptions.SYSTEM }),
  createdAt: schema => schema.meta({ description: "创建时间" }),
  createdBy: schema => schema.meta({ description: "创建人" }),
  updatedAt: schema => schema.meta({ description: "更新时间" }),
  updatedBy: schema => schema.meta({ description: "更新人" }),
});

/**
 * Insert Schema (used for insertions)
 * Insert Schema（插入时使用）
 */
export const insertSystemParamsSchema = createInsertSchema(systemParams).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});
