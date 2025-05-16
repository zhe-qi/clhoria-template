import { z } from "@hono/zod-openapi";

import { formatSafeJson } from "@/utils";

export const JoinConditionSchema = z.object({
  type: z.enum(["left", "inner", "right", "full"]).optional().default("left"),
  on: z.record(z.string(), z.string()),
  as: z.string().optional(),
});

export const JoinConfigSchema = z.record(z.string(), JoinConditionSchema);

export const WhereOperatorSchema = z.object({
  equals: z.any().optional().describe("等于"),
  not: z.any().optional().describe("不等于"),
  in: z.array(z.any()).optional().describe("在范围内"),
  notIn: z.array(z.any()).optional().describe("不在范围内"),
  lt: z.any().optional().describe("小于"),
  lte: z.any().optional().describe("小于等于"),
  gt: z.any().optional().describe("大于"),
  gte: z.any().optional().describe("大于等于"),
  contains: z.string().optional().describe("包含"),
  startsWith: z.string().optional().describe("以...开始"),
  endsWith: z.string().optional().describe("以...结束"),
}).partial();

// 定义递归类型的基础结构
function makeWhereConditionSchema() {
  // 创建一个递归引用占位符
  const baseSchema = z.record(z.string(), z.any());

  // 定义条件组结构
  const conditionGroup = z.object({
    AND: z.array(baseSchema).optional().describe("与"),
    OR: z.array(baseSchema).optional().describe("或"),
    NOT: baseSchema.optional().describe("非"),
  }).partial().describe("Where条件组");

  // 完整的 where 条件 schema
  return z.record(
    z.string(),
    z.union([
      z.any(),
      WhereOperatorSchema,
      conditionGroup,
    ]).describe("Where条件 参考：https://prisma.org.cn/docs/orm/reference/prisma-client-reference#equals"),
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
  skip: z.coerce.number().int().nonnegative().optional().default(0).describe("页码"),
  take: z.coerce.number().int().positive().optional().default(10).describe("每页条数"),
  where: z.preprocess(formatSafeJson, WhereConditionSchema.optional()),
  orderBy: z.preprocess(formatSafeJson, OrderBySchema.optional()).describe("排序 例如: { field: 'createdAt', order: 'desc' }"),
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
