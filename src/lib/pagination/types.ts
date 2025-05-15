import type { DrizzleTypeError, SQL, Subquery } from "drizzle-orm";
import type { CreatePgSelectFromBuilderMode, PgColumn, PgTable, SelectedFields, TableLikeHasEmptySelection } from "drizzle-orm/pg-core";
import type { PgViewBase } from "drizzle-orm/pg-core/view-base";
import type { GetSelectTableName, GetSelectTableSelection } from "drizzle-orm/query-builders/select.types";
import type { z } from "zod";

import type { PaginationParamsSchema } from "./schema";

// Where操作符对象类型
export interface WhereOperatorObject {
  [key: string]: unknown;
}

// Where条件对象类型
export type WhereCondition = Record<string, unknown | WhereOperatorObject | WhereConditionGroup>;

// Where条件组类型
export interface WhereConditionGroup {
  AND?: WhereCondition[];
  OR?: WhereCondition[];
  NOT?: WhereCondition;
}

// 定义分页结果接口
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    skip: number;
    take: number;
  };
}

// 操作符映射
export interface OperatorMap {
  [key: string]: (field: PgColumn, value: unknown) => SQL<unknown>;
}

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export type QuerySource = PgTable | Subquery | PgViewBase | SQL;

export type QueryBuilderMode = "db" | "qb";

export type QuerySourceWithoutReturningClause<TFrom extends QuerySource> = TableLikeHasEmptySelection<TFrom> extends true
  ? DrizzleTypeError<"Cannot reference a data-modifying statement subquery if it doesn't contain a `returning` clause">
  : TFrom;

export type TableFieldsType = ParamsType<PgColumn>;

// QueryBuilderMode, GetSelectTableName<QuerySource>, TSelection extends undefined ? GetSelectTableSelection<QuerySource> : TSelection, TSelection extends undefined ? "single" : "partial"

export type QuerySelectBuilderModeType<TSelection extends SelectedFields | undefined> = CreatePgSelectFromBuilderMode<
  QueryBuilderMode,
  GetSelectTableName<QuerySource>,
  TSelection extends undefined ? GetSelectTableSelection<QuerySource> : TSelection,
  TSelection extends undefined ? "single" : "partial"
>;

/**
 * Join 查询类型
 */
export type JoinType = "left" | "inner" | "right" | "full";

/**
 * 单个表的连接配置
 */
export interface JoinCondition {
  /**
   * Join 类型
   * @default 'left'
   */
  type?: JoinType;

  /**
   * Join 条件，键为主表字段，值为连接表字段
   */
  on: Record<string, string>;
}

/**
 * 多表连接配置，键为表别名，值为连接配置
 */
export type JoinConfig = Record<string, JoinCondition>;

/**
 * 返回类型，当有错误时，返回错误，否则返回结果，互斥关系
 */
export type ToResult<T, E = Error> =
  | readonly [E, null]
  | readonly [null, T];
