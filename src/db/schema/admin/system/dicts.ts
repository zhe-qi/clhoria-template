import { index, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { statusEnum } from "@/db/schema/_shard/enums";
import { Status } from "@/lib/enums";
import { StatusDescriptions } from "@/lib/schemas";

/**
 * 字典项类型定义
 */
export type DictItem = {
  /** 显示文本 */
  label: string;
  /** 字典值 */
  value: string;
  /** 排序序号 */
  sort: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 标签颜色（用于前端显示） */
  color?: string;
};

/**
 * 业务字典表
 * 用于动态配置各种字典数据（如用户状态、订单类型等）
 * 字典项使用 JSONB 数组存储，无需额外的字典项表
 */
export const systemDicts = pgTable("system_dicts", {
  ...baseColumns,
  /** 字典编码（唯一标识，如 "user_status"） */
  code: varchar({ length: 64 }).notNull().unique(),
  /** 字典名称（如 "用户状态"） */
  name: varchar({ length: 128 }).notNull(),
  /** 字典描述 */
  description: text(),
  /** 字典项数组（使用 JSONB 存储） */
  items: jsonb().$type<DictItem[]>().default([]).notNull(),
  /** 启用/禁用状态 */
  status: statusEnum().default(Status.ENABLED).notNull(),
}, table => [
  // code 字段的唯一约束已经包含了索引
  // 为 status 字段添加索引，用于查询启用的字典
  index("system_dicts_status_idx").on(table.status),
]);

/**
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
 * Insert Schema（插入时使用）
 */
export const insertSystemDictsSchema = createInsertSchema(systemDicts).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});
