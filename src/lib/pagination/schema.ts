import { z } from "@hono/zod-openapi";

import { formatSafeJson } from "@/utils";

// 单个连接配置 Schema
export const JoinConditionSchema = z.object({
  type: z.enum(["left", "inner", "right", "full"]).optional().default("left"),
  // 连接条件，键为主表字段，值为连接表字段
  on: z.record(z.string(), z.string()),
});

// 支持多表连接的 Schema
export const JoinConfigSchema = z.record(z.string(), JoinConditionSchema);

// Where 操作符 Schema
export const WhereOperatorSchema = z.object({
  equals: z.any().optional(),
  not: z.any().optional(),
  in: z.array(z.any()).optional(),
  notIn: z.array(z.any()).optional(),
  lt: z.any().optional(),
  lte: z.any().optional(),
  gt: z.any().optional(),
  gte: z.any().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
}).partial();

// 定义递归类型的基础结构
function makeWhereConditionSchema() {
  // 创建一个递归引用占位符
  const baseSchema = z.record(z.string(), z.any());

  // 定义条件组结构
  const conditionGroup = z.object({
    AND: z.array(baseSchema).optional(),
    OR: z.array(baseSchema).optional(),
    NOT: baseSchema.optional(),
  }).partial();

  // 完整的 where 条件 schema
  return z.record(
    z.string(),
    z.union([
      z.any(),
      WhereOperatorSchema,
      conditionGroup,
    ]),
  );
}

// Where 条件 Schema
export const WhereConditionSchema = makeWhereConditionSchema();

// OrderBy Schema
export const OrderBySchema = z.union([
  z.record(z.string(), z.enum(["asc", "desc"])),
  z.array(z.record(z.string(), z.enum(["asc", "desc"]))),
]);

// 基础的查询参数Schema
export const PaginationParamsSchema = z.object({
  skip: z.coerce.number().int().nonnegative().optional().default(0),
  take: z.coerce.number().int().positive().optional().default(10),
  where: z.preprocess(formatSafeJson, WhereConditionSchema.optional()),
  orderBy: z.preprocess(formatSafeJson, OrderBySchema.optional()),
  join: z.preprocess(formatSafeJson, JoinConfigSchema.optional()),
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
