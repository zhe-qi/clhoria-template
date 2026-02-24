import type { SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { EmptyObject, Simplify, UnknownRecord } from "type-fest";

import { z } from "@hono/zod-openapi";

import logger from "@/lib/services/logger";

/**
 * Refine CRUD operators Schema
 * Refine CRUD 操作符 Schema
 */
export const CrudOperatorsSchema = z.enum([
  // Equality operators / 相等性操作符
  "eq",
  "ne",
  // Comparison operators / 比较操作符
  "lt",
  "gt",
  "lte",
  "gte",
  // Array operators / 数组操作符
  "in",
  "nin",
  "ina",
  "nina",
  // String operators / 字符串操作符
  "contains",
  "ncontains",
  "containss",
  "ncontainss",
  // Range operators / 范围操作符
  "between",
  "nbetween",
  // Null operators / 空值操作符
  "null",
  "nnull",
  // String matching operators / 字符串匹配操作符
  "startswith",
  "nstartswith",
  "startswiths",
  "nstartswiths",
  "endswith",
  "nendswith",
  "endswiths",
  "nendswiths",
  // Logical operators / 逻辑操作符
  "or",
  "and",
]);

/**
 * Logical filter Schema
 * 逻辑过滤器 Schema
 */
export const LogicalFilterSchema = z.object({
  field: z.string().min(1, "字段名不能为空"),
  operator: CrudOperatorsSchema.exclude(["or", "and"]),
  value: z.any(),
});

/**
 * Conditional filter Schema (recursive definition)
 * 条件过滤器 Schema (递归定义)
 */
export const ConditionalFilterSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    key: z.string().optional(),
    operator: z.enum(["or", "and"]),
    value: z.array(z.union([LogicalFilterSchema, ConditionalFilterSchema])),
  }),
);

/**
 * CRUD filter Schema
 * CRUD 过滤器 Schema
 */
export const CrudFilterSchema = z.union([
  LogicalFilterSchema,
  ConditionalFilterSchema,
]);

/**
 * CRUD filters array Schema
 * CRUD 过滤器数组 Schema
 */
export const CrudFiltersSchema = z.array(CrudFilterSchema);

/**
 * CRUD sorting Schema
 * CRUD 排序 Schema
 */
export const CrudSortSchema = z.object({
  field: z.string().min(1, "排序字段名不能为空"),
  order: z.enum(["asc", "desc"]),
});

/**
 * CRUD sorting array Schema
 * CRUD 排序数组 Schema
 */
export const CrudSortingSchema = z.array(CrudSortSchema);

/**
 * Pagination Schema
 * 分页 Schema
 */
export const PaginationSchema = z.object({
  current: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  mode: z.enum(["client", "server", "off"]).optional(),
});

/**
 * Helper function: check object depth
 * 辅助函数：检查对象深度
 */
function getDepth(obj: any, depth = 0): number {
  if (depth > 10)
    return depth; // Prevent infinite recursion / 防止无限递归
  if (typeof obj !== "object" || obj === null)
    return depth;

  let maxDepth = depth;
  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null) {
      maxDepth = Math.max(maxDepth, getDepth(value, depth + 1));
    }
  }
  return maxDepth;
}

/**
 * JSON string preprocessor
 * Safely parses JSON string parameters
 * JSON 字符串预处理函数
 * 安全地解析 JSON 字符串参数
 */
function safeJsonPreprocess(val: unknown): unknown {
  if (val === undefined || val === null) {
    return undefined;
  }

  if (typeof val === "string") {
    const trimmed = val.trim();

    // Length limit to prevent DoS attacks / 增加长度限制，防止DoS攻击
    if (trimmed.length > 10000) {
      logger.warn("[查询参数]: JSON字符串过长，已截断");
      return undefined;
    }

    // Check basic safety patterns / 检查基本的安全模式
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
      return undefined;
    }
    if (trimmed === "{}") {
      return {};
    }
    if (trimmed === "[]") {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      // Recursive depth limit to prevent deep nesting attacks / 递归深度限制，防止深层嵌套攻击
      if (getDepth(parsed) > 5) {
        logger.warn("[查询参数]: JSON嵌套层级过深");
        return undefined;
      }
      return parsed;
    }
    catch (error) {
      // Log parse error without exposing details / 记录解析错误但不暴露详细信息
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, "[查询参数]: JSON解析失败");
      return undefined;
    }
  }

  return val;
}

/**
 * Refine query parameters Schema
 * Used to validate query parameters from the frontend
 * Refine 查询参数 Schema
 * 用于验证来自前端的查询参数
 */
export const RefineQueryParamsSchema = z.object({
  // Pagination parameters / 分页参数
  current: z.coerce.number().int().positive().optional().default(1).openapi({
    description: "当前页码",
    example: 1,
  }),

  pageSize: z.coerce.number().int().positive().max(100).optional().default(10).openapi({
    description: "每页大小",
    example: 10,
  }),

  mode: z.enum(["server", "client", "off"]).optional().default("server").openapi({
    description: "分页模式：server=服务端分页，client=客户端分页，off=不分页",
    example: "server",
  }),

  // Filter conditions (supports JSON string) / 过滤条件（支持 JSON 字符串）
  filters: z.preprocess(
    safeJsonPreprocess,
    CrudFiltersSchema.optional(),
  ).optional().openapi({
    type: "string",
    description: "过滤条件，JSON 字符串格式",
    example: JSON.stringify([
      { field: "status", operator: "eq", value: "active" },
      { field: "name", operator: "contains", value: "john" },
    ]),
  }),

  // Sorting conditions (supports JSON string) / 排序条件（支持 JSON 字符串）
  sorters: z.preprocess(
    safeJsonPreprocess,
    CrudSortingSchema.optional(),
  ).optional().openapi({
    type: "string",
    description: "排序条件，JSON 字符串格式",
    example: JSON.stringify([
      { field: "createdAt", order: "desc" },
      { field: "name", order: "asc" },
    ]),
  }),
}).partial();

/**
 * Result Schema
 * Used for API response structure definition
 * 结果 Schema
 * 用于 API 响应的结构定义
 */
export function RefineResultSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  });
}

/**
 * Type definitions inferred from Zod schemas
 * 从 Zod schemas 推导的类型定义
 */
export type CrudOperators = z.infer<typeof CrudOperatorsSchema>;
export type LogicalFilter = z.infer<typeof LogicalFilterSchema>;
export type ConditionalFilter = z.infer<typeof ConditionalFilterSchema>;
export type CrudFilter = z.infer<typeof CrudFilterSchema>;
export type CrudFilters = z.infer<typeof CrudFiltersSchema>;
export type CrudSort = z.infer<typeof CrudSortSchema>;
export type CrudSorting = z.infer<typeof CrudSortingSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type RefineQueryParams = z.infer<typeof RefineQueryParamsSchema>;

// ============ Query Configuration and Utility Types / 查询配置和工具类型 ============

/** Refine query result interface / Refine 查询结果接口 */
export type RefineQueryResult<T> = {
  data: T[];
  total: number;
};

/** Query error type / 查询错误类型 */
export class RefineQueryError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "RefineQueryError";
    this.code = code;
  }
}

/** Join type / Join 类型 */
export type JoinType = "inner" | "left" | "right";

/** Join definition interface / Join 定义接口 */
export type JoinDefinition = Simplify<{
  table: PgTable;
  type: JoinType;
  on: SQL<unknown>;
}>;

/** Join query configuration interface / Join 查询配置接口 */
export type JoinConfig = Simplify<{
  joins: readonly JoinDefinition[];
  selectFields?: Readonly<Record<string, PgColumn | SQL<unknown>>> | EmptyObject;
  groupBy?: readonly PgColumn[];
}>;

/** Refine query execution configuration interface / Refine 查询执行配置接口 */
export type RefineQueryConfig<_T = UnknownRecord> = Simplify<{
  table: PgTable;
  queryParams: Simplify<{
    filters?: CrudFilters;
    sorters?: CrudSorting;
    pagination?: Pagination;
  }>;
  joinConfig?: JoinConfig;
  allowedFields?: readonly string[];
}>;

/** Query execution parameters interface / 查询执行参数接口 */
export type QueryExecutionParams<_T = UnknownRecord> = Simplify<{
  resource: PgTable;
  filters?: CrudFilters;
  sorters?: CrudSorting;
  pagination?: Pagination;
  tableColumns?: Readonly<Record<string, PgColumn>> | EmptyObject;
  joinConfig?: JoinConfig;
  allowedFields?: readonly string[];
}>;

/** Tuple result type for error handling / 元组结果类型，用于错误处理 */
export type Result<T, E = RefineQueryError> = [E, null] | [null, T];
