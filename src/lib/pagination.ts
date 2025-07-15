import type { PgSelect } from "drizzle-orm/pg-core";

import { z } from "@hono/zod-openapi";
import { count } from "drizzle-orm";

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
  totalPages: z.number().describe("总页数"),
  hasNext: z.boolean().describe("是否有下一页"),
  hasPrev: z.boolean().describe("是否有上一页"),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export function createPaginatedResultSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema).describe("数据列表"),
    meta: PaginationMetaSchema.describe("分页信息"),
  });
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export async function withPagination<T extends PgSelect>(
  query: T,
  options: PaginationOptions,
): Promise<{ data: Awaited<T>; meta: PaginationMeta }> {
  const { page, limit } = options;
  const offset = (page - 1) * limit;

  // 获取总数
  const baseQuery = query as any;
  const table = baseQuery.config.table;

  const [{ count: total }] = await baseQuery.db
    .select({ count: count() })
    .from(table);

  // 获取分页数据
  const data = await query.limit(limit).offset(offset);

  const meta = createPaginationMeta(page, limit, total);

  return { data, meta };
}

export async function withPaginationAndCount<T extends PgSelect>(
  query: T,
  countQuery: any,
  options: PaginationOptions,
): Promise<{ data: Awaited<T>; meta: PaginationMeta }> {
  const { page, limit } = options;
  const offset = (page - 1) * limit;

  // 获取总数
  const [{ count: total }] = await countQuery;

  // 获取分页数据
  const data = await query.limit(limit).offset(offset);

  const meta = createPaginationMeta(page, limit, total);

  return { data, meta };
}
