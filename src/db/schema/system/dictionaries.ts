import { z } from "@hono/zod-openapi";
import { integer, jsonb, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

/**
 * 字典项接口定义
 */
export interface DictionaryItem {
  /** 项编码 */
  code: string;
  /** 显示标签 */
  label: string;
  /** 实际值 */
  value: string;
  /** 项描述 */
  description?: string;
  /** 显示颜色 */
  color?: string;
  /** 图标 */
  icon?: string;
  /** 状态: 1=启用 0=禁用 */
  status: number;
  /** 排序 */
  sortOrder: number;
}

/**
 * 系统字典表
 */
export const systemDictionaries = pgTable("system_dictionaries", {
  ...defaultColumns,
  /** 字典编码，唯一标识 */
  code: varchar({ length: 100 }).notNull(),
  /** 字典名称 */
  name: varchar({ length: 200 }).notNull(),
  /** 字典描述 */
  description: varchar({ length: 500 }),
  /** 字典项数组 */
  items: jsonb().$type<DictionaryItem[]>().default([]).notNull(),
  /** 状态: 1=启用 0=禁用 */
  status: integer().default(1).notNull(),
  /** 排序 */
  sortOrder: integer().default(0).notNull(),
});

/**
 * 字典项Schema定义
 */
export const dictionaryItemSchema = z.object({
  code: z.string().min(1).meta({ description: "项编码" }),
  label: z.string().min(1).meta({ description: "显示标签" }),
  value: z.string().meta({ description: "实际值" }),
  description: z.string().optional().meta({ description: "项描述" }),
  color: z.string().optional().meta({ description: "显示颜色" }),
  icon: z.string().optional().meta({ description: "图标" }),
  status: z.number().int().min(0).max(1).meta({ description: "状态: 1=启用 0=禁用" }),
  sortOrder: z.number().int().min(0).meta({ description: "排序" }),
});

/**
 * 查询字典Schema
 */
export const selectSystemDictionariesSchema = createSelectSchema(systemDictionaries, {
  id: schema => schema.meta({ description: "字典ID" }),
  code: schema => schema.meta({ description: "字典编码" }),
  name: schema => schema.meta({ description: "字典名称" }),
  description: schema => schema.meta({ description: "字典描述" }),
  items: _schema => z.array(dictionaryItemSchema).meta({ description: "字典项列表" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用" }),
  sortOrder: schema => schema.meta({ description: "排序" }),
  createdAt: schema => schema.meta({ description: "创建时间" }),
  updatedAt: schema => schema.meta({ description: "更新时间" }),
  createdBy: schema => schema.meta({ description: "创建人" }),
  updatedBy: schema => schema.meta({ description: "更新人" }),
});

/**
 * 创建字典Schema
 */
export const insertSystemDictionariesSchema = createInsertSchema(systemDictionaries, {
  code: schema => schema.min(1, "字典编码不能为空").meta({ description: "字典编码" }),
  name: schema => schema.min(1, "字典名称不能为空").meta({ description: "字典名称" }),
  description: schema => schema.optional().meta({ description: "字典描述" }),
  items: _schema => z.array(dictionaryItemSchema).default([]).meta({ description: "字典项列表" }),
  status: schema => schema.default(1).meta({ description: "状态: 1=启用 0=禁用" }),
  sortOrder: schema => schema.default(0).meta({ description: "排序" }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

/**
 * 更新字典Schema
 */
export const patchSystemDictionariesSchema = insertSystemDictionariesSchema.partial();

/**
 * 响应字典Schema（用于API响应）
 */
export const responseSystemDictionariesSchema = selectSystemDictionariesSchema;

/**
 * 批量获取字典Schema
 */
export const batchGetDictionariesSchema = z.object({
  codes: z.array(z.string().min(1)).min(1).max(50).meta({ description: "字典编码列表，最多50个" }),
});
