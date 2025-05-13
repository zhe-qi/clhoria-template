import type { DrizzleTypeError, SQL, Subquery } from "drizzle-orm";
import type { PgColumn, PgTable, TableLikeHasEmptySelection } from "drizzle-orm/pg-core";
import type { PgViewBase } from "drizzle-orm/pg-core/view-base";
import type { z } from "zod";

import type { PaginationParamsSchema } from "./schema";

// 条件值类型
export type WhereValue = string | number | boolean | null | string[] | number[] | boolean[];

// Where操作符对象类型
export interface WhereOperatorObject {
  [key: string]: WhereValue;
}

// Where条件对象类型
export type WhereCondition = Record<string, WhereValue | WhereOperatorObject | WhereConditionGroup>;

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
  [key: string]: (field: PgColumn, value: WhereValue) => SQL<unknown>;
}

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export type QuerySource = PgTable | Subquery | PgViewBase | SQL;

export type QueryBuilderMode = "db" | "qb";

export type QuerySourceWithoutReturningClause<TFrom extends QuerySource> = TableLikeHasEmptySelection<TFrom> extends true
  ? DrizzleTypeError<"Cannot reference a data-modifying statement subquery if it doesn't contain a `returning` clause">
  : TFrom;

export type TableFieldsType = ParamsType<PgColumn>;
