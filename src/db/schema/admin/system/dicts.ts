import { index, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { statusEnum } from "@/db/schema/_shard/enums";
import { Status } from "@/lib/enums";
import { StatusDescriptions } from "@/lib/schemas";

/**
 * Dictionary item type definition
 * 字典项类型定义
 */
export type DictItem = {
  /** Display text / 显示文本 */
  label: string;
  /** Dictionary value / 字典值 */
  value: string;
  /** Sort order / 排序序号 */
  sort: number;
  /** Whether disabled / 是否禁用 */
  disabled?: boolean;
  /** Tag color (for frontend display) / 标签颜色（用于前端显示） */
  color?: string;
};

/**
 * Business dictionary table
 * Used for dynamic configuration of various dictionary data (e.g., user status, order types)
 * Dictionary items are stored as JSONB arrays, no separate dictionary items table needed
 * 业务字典表
 * 用于动态配置各种字典数据（如用户状态、订单类型等）
 * 字典项使用 JSONB 数组存储，无需额外的字典项表
 */
export const systemDicts = pgTable("system_dicts", {
  ...baseColumns,
  /** Dictionary code (unique identifier, e.g., "user_status") / 字典编码（唯一标识，如 "user_status"） */
  code: varchar({ length: 64 }).notNull().unique(),
  /** Dictionary name (e.g., "user status") / 字典名称（如 "用户状态"） */
  name: varchar({ length: 128 }).notNull(),
  /** Dictionary description / 字典描述 */
  description: text(),
  /** Dictionary items array (stored as JSONB) / 字典项数组（使用 JSONB 存储） */
  items: jsonb().$type<DictItem[]>().default([]).notNull(),
  /** Enabled/disabled status / 启用/禁用状态 */
  status: statusEnum().default(Status.ENABLED).notNull(),
}, table => [
  // Unique constraint on code field already includes an index / code 字段的唯一约束已经包含了索引
  // Add index on status field for querying enabled dictionaries / 为 status 字段添加索引，用于查询启用的字典
  index("system_dicts_status_idx").on(table.status),
]);

/**
 * Select Schema (used for queries)
 * Select Schema（查询时使用）
 */
export const selectSystemDictsSchema = createSelectSchema(systemDicts, {
  id: schema => schema.meta({ description: "字典ID" }),
  code: schema => schema.meta({ description: "字典编码" }),
  name: schema => schema.meta({ description: "字典名称" }),
  description: schema => schema.meta({ description: "字典描述" }),
  items: schema => schema.meta({ description: "字典项列表" }),
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
export const insertSystemDictsSchema = createInsertSchema(systemDicts).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});
