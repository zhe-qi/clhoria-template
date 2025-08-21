import type { DrizzleTypeError, SQL, Subquery } from "drizzle-orm";
import type { CreatePgSelectFromBuilderMode, PgColumn, PgTable, SelectedFields, TableLikeHasEmptySelection } from "drizzle-orm/pg-core";
import type { PgViewBase } from "drizzle-orm/pg-core/view-base";
import type { GetSelectTableName, GetSelectTableSelection } from "drizzle-orm/query-builders/select.types";
import type { z } from "zod";

import type { PaginationParamsSchema } from "./schema";

// 分页查询系统错误类定义

/**
 * 参数验证错误类
 * 当分页参数格式不正确或值无效时抛出
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * 查询执行错误类
 * 当数据库查询执行失败时抛出
 */
export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryError";
  }
}

// 分页查询系统类型定义

/**
 * 分页参数类型
 * 从 PaginationParamsSchema Zod 模式推断的类型
 */
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * 查询数据源类型
 * 支持的查询源：数据表、子查询、视图、SQL 语句
 */
export type QuerySource = PgTable | Subquery | PgViewBase | SQL;

/**
 * 查询构建器模式类型
 * - db: 数据库模式
 * - qb: 查询构建器模式
 */
export type QueryBuilderMode = "db" | "qb";

/**
 * 无返回子句的查询源类型
 * 确保数据修改语句包含 returning 子句
 */
export type QuerySourceWithoutReturningClause<TFrom extends QuerySource> = TableLikeHasEmptySelection<TFrom> extends true
  ? DrizzleTypeError<"Cannot reference a data-modifying statement subquery if it doesn't contain a `returning` clause">
  : TFrom;

/**
 * 表字段类型映射
 * 将表字段类型映射为参数类型
 */
export type TableFieldsType = ParamsType<PgColumn>;

/**
 * 查询选择构建器模式类型
 * 泛型类型，用于构建查询选择器
 */
export type QuerySelectBuilderModeType<TSelection extends SelectedFields | undefined> = CreatePgSelectFromBuilderMode<
  QueryBuilderMode,
  GetSelectTableName<QuerySource>,
  TSelection extends undefined ? GetSelectTableSelection<QuerySource> : TSelection,
  TSelection extends undefined ? "single" : "partial"
>;

// 查询条件类型定义

/**
 * WHERE 操作符对象接口
 * 用于定义复杂的查询条件操作符
 */
export interface WhereOperatorObject {
  [key: string]: unknown;
}

/**
 * WHERE 条件类型
 * 支持嵌套的逻辑查询条件（AND、OR、NOT）
 */
export type WhereCondition = Record<string, unknown | WhereOperatorObject | WhereConditionGroup>;

/**
 * WHERE 条件组接口
 * 支持逻辑组合查询：AND、OR、NOT
 */
export interface WhereConditionGroup {
  /** AND 逻辑组合 */
  AND?: WhereCondition[];
  /** OR 逻辑组合 */
  OR?: WhereCondition[];
  /** NOT 逻辑否定 */
  NOT?: WhereCondition;
}

/**
 * 分页查询结果接口
 * 包含数据和元信息（总数、跳过数、获取数）
 * @template T 查询结果数据的类型
 */
export interface PaginatedResult<T> {
  /** 查询结果数据数组 */
  data: T[];
  /** 分页元信息 */
  meta: {
    /** 总记录数 */
    total: number;
    /** 跳过的记录数 */
    skip: number;
    /** 获取的记录数 */
    take: number;
  };
}

/**
 * 操作符映射接口
 * 定义字段操作符函数映射
 */
export interface OperatorMap {
  [key: string]: (field: PgColumn, value: unknown) => SQL<unknown>;
}

// JOIN 查询类型定义

/**
 * JOIN 查询类型
 * 支持的 SQL JOIN 类型
 */
export type JoinType = "left" | "inner" | "right" | "full";

/**
 * 单个表的连接配置接口
 * 定义表之间的 JOIN 关系
 */
export interface JoinCondition {
  /**
   * JOIN 类型
   * @default 'left'
   */
  type?: JoinType;

  /**
   * JOIN 条件，键为主表字段，值为连接表字段
   */
  on: Record<string, string>;

  /**
   * JOIN 别名
   */
  as?: string;
}

/**
 * 多表连接配置类型
 * 键为表别名，值为连接配置
 */
export type JoinConfig = Record<string, JoinCondition>;

// 通用工具类型定义

/**
 * 结果元组类型
 * 用于错误处理的元组类型，确保错误和结果互斥
 * @template T 成功结果的类型
 * @template E 错误类型，默认为 Error
 */
export type ToResult<T, E = Error> = [E, null] | [null, T];

/**
 * 参数类型映射
 * 将类型 T 映射为参数对象类型
 * @template T 要映射的类型
 */
export type ParamsType<T> = Record<string, T>;

// 内部类型定义

/**
 * 验证后的参数接口
 * 经过验证和标准化的查询参数
 */
export interface ValidatedParams {
  /** 跳过的记录数 */
  skip: number;
  /** 获取的记录数 */
  take: number;
  /** WHERE 查询条件 */
  where?: unknown;
  /** 排序条件 */
  orderBy?: unknown;
  /** JOIN 配置 */
  join?: Record<string, JoinCondition>;
}

/**
 * 查询上下文接口
 * 包含查询执行所需的上下文信息
 */
export interface QueryContext {
  /** 主查询表 */
  table: QuerySourceWithoutReturningClause<QuerySource>;
  /** 可用的 JOIN 表集合 */
  joinTables?: Record<string, PgTable>;
  /** 表字段映射 */
  tableFields: TableFieldsType;
  /** 表别名映射 */
  tableAliases: Record<string, string>;
}

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
}

/**
 * 分页查询结果类型
 * 返回 Promise 包装的 ToResult 元组，确保错误和结果的互斥性
 * @template TResult 查询结果的数据类型
 */
export type PaginatedToResult<TResult> = Promise<ToResult<PaginatedResult<TResult>>>;
