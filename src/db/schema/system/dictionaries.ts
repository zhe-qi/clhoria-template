import { z } from "@hono/zod-openapi";
import { integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

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
  /** 主键ID */
  id: uuid("id").primaryKey().defaultRandom(),
  /** 字典编码，唯一标识 */
  code: varchar("code", { length: 100 }).notNull(),
  /** 字典名称 */
  name: varchar("name", { length: 200 }).notNull(),
  /** 字典描述 */
  description: varchar("description", { length: 500 }),
  /** 字典项数组 */
  items: jsonb("items").$type<DictionaryItem[]>().default([]).notNull(),
  /** 状态: 1=启用 0=禁用 */
  status: integer("status").default(1).notNull(),
  /** 排序 */
  sortOrder: integer("sort_order").default(0).notNull(),
  /** 创建时间 */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  /** 更新时间 */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  /** 创建人 */
  createdBy: varchar("created_by", { length: 50 }),
  /** 更新人 */
  updatedBy: varchar("updated_by", { length: 50 }),
});

/**
 * 字典项Schema定义
 */
export const dictionaryItemSchema = z.object({
  code: z.string().min(1).describe("项编码"),
  label: z.string().min(1).describe("显示标签"),
  value: z.string().describe("实际值"),
  description: z.string().optional().describe("项描述"),
  color: z.string().optional().describe("显示颜色"),
  icon: z.string().optional().describe("图标"),
  status: z.number().int().min(0).max(1).describe("状态: 1=启用 0=禁用"),
  sortOrder: z.number().int().min(0).describe("排序"),
});

/**
 * 查询字典Schema
 */
export const selectSystemDictionariesSchema = createSelectSchema(systemDictionaries, {
  id: schema => schema.describe("字典ID"),
  code: schema => schema.describe("字典编码"),
  name: schema => schema.describe("字典名称"),
  description: schema => schema.describe("字典描述"),
  items: _schema => z.array(dictionaryItemSchema).describe("字典项列表"),
  status: schema => schema.describe("状态: 1=启用 0=禁用"),
  sortOrder: schema => schema.describe("排序"),
  createdAt: schema => schema.describe("创建时间"),
  updatedAt: schema => schema.describe("更新时间"),
  createdBy: schema => schema.describe("创建人"),
  updatedBy: schema => schema.describe("更新人"),
});

/**
 * 创建字典Schema
 */
export const insertSystemDictionariesSchema = createInsertSchema(systemDictionaries, {
  code: schema => schema.min(1, "字典编码不能为空").describe("字典编码"),
  name: schema => schema.min(1, "字典名称不能为空").describe("字典名称"),
  description: schema => schema.optional().describe("字典描述"),
  items: _schema => z.array(dictionaryItemSchema).default([]).describe("字典项列表"),
  status: schema => schema.default(1).describe("状态: 1=启用 0=禁用"),
  sortOrder: schema => schema.default(0).describe("排序"),
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
  codes: z.array(z.string().min(1)).min(1).max(50).describe("字典编码列表，最多50个"),
});
