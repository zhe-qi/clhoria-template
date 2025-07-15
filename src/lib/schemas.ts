import { z } from "@hono/zod-openapi";

export const IdUUIDParamsSchema = z.object({
  id: z.string().uuid().describe("UUID格式的ID"),
});

export const PaginationQuerySchema = z.object({
  skip: z.number().int().min(0).default(0).describe("跳过的记录数"),
  take: z.number().int().min(1).max(100).default(10).describe("获取的记录数"),
  search: z.string().optional().describe("搜索关键词"),
  orderBy: z.string().optional().describe("排序字段"),
  order: z.enum(["asc", "desc"]).optional().default("asc").describe("排序方向"),
});
