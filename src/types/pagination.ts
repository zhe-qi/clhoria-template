import type { PgTable } from "drizzle-orm/pg-core";

import type {
  PaginatedResult,
  PaginationParams,
  QuerySource,
  QuerySourceWithoutReturningClause,
  ToResult,
} from "@/lib/pagination/types";

/**
 * 分页查询参数接口
 * 定义执行分页查询时需要的所有参数
 */
export interface PaginatedParams {
  /** 主表 - 要查询的主要数据表 */
  table: QuerySourceWithoutReturningClause<QuerySource>;
  /** 分页参数 - 包含页数、每页大小、过滤条件、排序等 */
  params: PaginationParams;
  /** 联表查询白名单 - 允许进行 JOIN 操作的表集合 */
  joinTables?: Record<string, PgTable>;
  /** 用户域 - 多租户系统中的域标识 */
  domain?: string;
}

/**
 * 分页查询结果类型
 * 返回 Promise 包装的 ToResult 元组，确保错误和结果的互斥性
 * @template TResult 查询结果的数据类型
 */
export type PaginatedToResult<TResult> = Promise<ToResult<PaginatedResult<TResult>>>;
