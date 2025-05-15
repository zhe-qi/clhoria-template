import type { DrizzleTypeError, SQL, Subquery } from "drizzle-orm";
import type { CreatePgSelectFromBuilderMode, PgColumn, PgTable, SelectedFields, TableLikeHasEmptySelection } from "drizzle-orm/pg-core";
import type { PgViewBase } from "drizzle-orm/pg-core/view-base";
import type { GetSelectTableName, GetSelectTableSelection } from "drizzle-orm/query-builders/select.types";
import type { z } from "zod";

import type { PaginationParamsSchema } from "./schema";

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export type QuerySource = PgTable | Subquery | PgViewBase | SQL;

export type QueryBuilderMode = "db" | "qb";

export type QuerySourceWithoutReturningClause<TFrom extends QuerySource> = TableLikeHasEmptySelection<TFrom> extends true
  ? DrizzleTypeError<"Cannot reference a data-modifying statement subquery if it doesn't contain a `returning` clause">
  : TFrom;

export type TableFieldsType = ParamsType<PgColumn>;

export type QuerySelectBuilderModeType<TSelection extends SelectedFields | undefined> = CreatePgSelectFromBuilderMode<
  QueryBuilderMode,
  GetSelectTableName<QuerySource>,
  TSelection extends undefined ? GetSelectTableSelection<QuerySource> : TSelection,
  TSelection extends undefined ? "single" : "partial"
>;

export interface WhereOperatorObject {
  [key: string]: unknown;
}

export type WhereCondition = Record<string, unknown | WhereOperatorObject | WhereConditionGroup>;

export interface WhereConditionGroup {
  AND?: WhereCondition[];
  OR?: WhereCondition[];
  NOT?: WhereCondition;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    skip: number;
    take: number;
  };
}

export interface OperatorMap {
  [key: string]: (field: PgColumn, value: unknown) => SQL<unknown>;
}

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

  /**
   * Join 别名
   */
  as?: string;
}

/**
 * 多表连接配置，键为表别名，值为连接配置
 */
export type JoinConfig = Record<string, JoinCondition>;

export type ToResult<T, E = Error> = [E, null] | [null, T];
