import { z } from "@hono/zod-openapi";

// 单个连接配置 Schema
export const JoinConditionSchema = z.object({
  type: z.enum(["left", "inner", "right", "full"]).optional().default("left"),
  // 连接条件，键为主表字段，值为连接表字段
  on: z.record(z.string(), z.string()),
  // 表别名
  as: z.string().optional(),
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

// 更灵活的预处理函数，支持 null、undefined、空字符串、空对象和正常JSON字符串
function flexibleJsonPreprocess(val: any) {
  // 如果是 undefined 或 null，直接返回 undefined
  if (val === undefined || val === null) {
    return undefined;
  }

  // 如果是字符串
  if (typeof val === "string") {
    const trimmed = val.trim();
    // 空字符串或 "null" 或 "undefined" 返回 undefined
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
      return undefined;
    }
    // 空对象字符串返回空对象
    if (trimmed === "{}") {
      return {};
    }
    // 尝试解析 JSON
    try {
      return JSON.parse(trimmed);
    }
    catch {
      return undefined;
    }
  }

  // 如果是对象且为空对象，保持为空对象
  if (typeof val === "object" && val !== null && Object.keys(val).length === 0) {
    return {};
  }

  // 其他情况直接返回
  return val;
}

// 基础的查询参数Schema - 所有参数都是可选的
export const PaginationParamsSchema = z.object({
  skip: z.coerce.number().int().nonnegative().optional().default(0),
  take: z.coerce.number().int().positive().optional().default(10),
  where: z.preprocess(
    flexibleJsonPreprocess,
    z.union([
      WhereConditionSchema,
      z.object({}).optional(),
      z.undefined(),
      z.null(),
    ]).optional(),
  ).optional().openapi({
    type: "object",
    description: "查询条件，参考文档 https://prisma.org.cn/docs/orm/reference/prisma-client-reference#or",
    example: {
      name: { contains: "张三" },
      age: { gte: 18 },
      AND: [
        { status: { equals: "active" } },
        { createdAt: { gte: "2023-01-01" } },
      ],
    },
  }),
  orderBy: z.preprocess(
    flexibleJsonPreprocess,
    z.union([
      OrderBySchema,
      z.object({}).optional(),
      z.undefined(),
      z.null(),
    ]).optional(),
  ).optional().openapi({
    type: "object",
    description: "排序配置，支持复杂条件",
    example: {
      createdAt: "desc",
      name: "asc",
    },
  }),
  join: z.preprocess(
    flexibleJsonPreprocess,
    z.union([
      JoinConfigSchema,
      z.object({}).optional(),
      z.undefined(),
      z.null(),
    ]).optional(),
  ).optional().openapi({
    type: "object",
    description: "表连接配置，需要联系后端将表添加到白名单",
    example: {
      user: {
        type: "left",
        on: { userId: "id" },
        as: "u",
      },
    },
  }),
}).partial();

// 分页结果 Schema
export function GetPaginatedResultSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    meta: z.object({
      total: z.number().meta({ description: "总条数" }),
      skip: z.number().meta({ description: "页码" }),
      take: z.number().meta({ description: "每页条数" }),
    }),
  });
}
