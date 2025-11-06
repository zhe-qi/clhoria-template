/**
 * Refine 查询配置和扩展类型定义
 * 基础类型(CrudOperators, CrudFilters, CrudSorting等)已迁移到 schemas.ts,通过 Zod 推导生成
 * 此文件仅保留查询配置、Join相关和工具类型
 */

import type { SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { EmptyObject, Simplify, UnknownRecord } from "type-fest";

import type { CrudFilters, CrudSorting, Pagination } from "./schemas";

/**
 * Refine 查询结果接口
 */
export interface RefineQueryResult<T> {
  /** 数据数组 */
  data: T[];
  /** 总记录数 */
  total: number;
}

/**
 * 错误类型
 */
export class RefineQueryError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "RefineQueryError";
    this.code = code;
  }
}

/**
 * Join 类型枚举
 */
export type JoinType = "inner" | "left" | "right";

/**
 * Join 定义接口
 */
export type JoinDefinition = Simplify<{
  /** 要联接的表 */
  table: PgTable;
  /** 联接类型 */
  type: JoinType;
  /** 联接条件 */
  on: SQL<unknown>;
}>;

/**
 * Join 查询配置接口
 */
export type JoinConfig = Simplify<{
  /** Join 定义数组 */
  joins: readonly JoinDefinition[];
  /** 自定义选择字段 */
  selectFields?: Readonly<Record<string, PgColumn | SQL<unknown>>> | EmptyObject;
  /** 分组字段 */
  groupBy?: readonly PgColumn[];
}>;

/**
 * Refine 查询执行配置接口
 */
export type RefineQueryConfig<_T = UnknownRecord> = Simplify<{
  /** 主表 */
  table: PgTable;
  /** 查询参数(来自前端) */
  queryParams: Simplify<{
    filters?: CrudFilters;
    sorters?: CrudSorting;
    pagination?: Pagination;
  }>;
  /** Join 配置(后端控制) */
  joinConfig?: JoinConfig;
  /** 允许的字段白名单 */
  allowedFields?: readonly string[];
}>;

/**
 * 查询执行参数接口
 */
export type QueryExecutionParams<_T = UnknownRecord> = Simplify<{
  /** 表或查询源 */
  resource: PgTable;
  /** 过滤条件 */
  filters?: CrudFilters;
  /** 排序条件 */
  sorters?: CrudSorting;
  /** 分页配置 */
  pagination?: Pagination;
  /** 表列映射 */
  tableColumns?: Readonly<Record<string, PgColumn>> | EmptyObject;
  /** Join 配置 */
  joinConfig?: JoinConfig;
  /** 允许的字段白名单 */
  allowedFields?: readonly string[];
}>;

/**
 * 元组结果类型
 * 用于错误处理
 */
export type Result<T, E = RefineQueryError> = [E, null] | [null, T];
