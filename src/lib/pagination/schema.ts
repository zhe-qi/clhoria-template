import { z } from "@hono/zod-openapi";

import { formatSafeJson } from "@/utils/date/formatter";

// 基础的查询参数Schema
export const PaginationParamsSchema = z.object({
  skip: z.union([
    z.number().int().nonnegative(),
    z.string().regex(/^\d+$/).transform(Number),
  ]).optional().openapi({ description: "页码" }),
  take: z.union([
    z.number().int().nonnegative(),
    z.string().regex(/^\d+$/).transform(Number),
  ]).optional().openapi({ description: "每页条数" }),
  orderBy: z.preprocess(formatSafeJson, z.any()).optional().openapi({
    description: "排序, 格式: { field: 'asc' | 'desc' }",
  }),
  where: z.preprocess(formatSafeJson, z.any()).optional().openapi({
    description: "过滤条件，prisma 格式 https://prisma.org.cn/docs/orm/reference/prisma-client-reference#equals",
  }),
});

// 分页结果 Schema
export function GetPaginatedResultSchema(dataSchema: z.ZodSchema) {
  return z.object({
    data: z.array(dataSchema).openapi({ description: "列表查询结果" }),
    meta: z.object({
      total: z.number().openapi({ description: "总条数" }),
      skip: z.number().openapi({ description: "页码" }),
      take: z.number().openapi({ description: "每页条数" }),
    }),
  });
}
