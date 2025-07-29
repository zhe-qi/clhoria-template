import type { SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { z } from "@hono/zod-openapi";
import { count } from "drizzle-orm";

import db from "@/db";

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1).describe("页码"),
  limit: z.coerce.number().min(1).max(100).default(10).describe("每页数量"),
  search: z.string().optional().describe("搜索关键词"),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().describe("当前页码"),
  limit: z.number().describe("每页数量"),
  total: z.number().describe("总数量"),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export function createPaginatedResultSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema).describe("数据列表"),
    meta: PaginationMetaSchema.describe("分页信息"),
  });
}

export async function pagination<T = any>(
  table: PgTable,
  whereCondition?: SQL,
  options: { orderBy?: (PgColumn | SQL | SQL.Aliased)[]; page: number; limit: number } = { page: 1, limit: 10 },
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const { page, limit, orderBy } = options;
  const offset = (page - 1) * limit;

  // 构建查询
  let query = db.select().from(table).$dynamic();

  if (whereCondition) {
    query = query.where(whereCondition);
  }

  // 添加排序
  if (orderBy && orderBy.length > 0) {
    query = query.orderBy(...orderBy);
  }

  // 构建计数查询
  const baseCountQuery = db.select({ count: count() }).from(table);
  const countQuery = whereCondition ? baseCountQuery.where(whereCondition) : baseCountQuery;

  // 并行执行总数查询和分页数据查询
  const [countResult, data] = await Promise.all([
    countQuery,
    query.limit(limit).offset(offset),
  ]);

  const [{ count: total }] = countResult;

  return { data: data as T[], meta: { page, total, limit } };
}
