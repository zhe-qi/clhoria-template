import type { SQL, TableConfig } from "drizzle-orm";
import type { PgColumn, PgSelectBase, PgTableWithColumns } from "drizzle-orm/pg-core";

import { and, asc, count, desc, eq, getTableColumns, gt, gte, inArray, like, lt, lte, not, or } from "drizzle-orm";

import db from "@/db";

import type { OperatorMap, PaginatedResult, PaginationParams, WhereValue } from "./types";

const operatorsMap: OperatorMap = {
  equals: (field, value) => eq(field, value),
  not: (field, value) => not(eq(field, value)),
  in: (field, value) => inArray(field, value as any[]),
  notIn: (field, value) => not(inArray(field, value as any[])),
  lt: (field, value) => lt(field, value),
  lte: (field, value) => lte(field, value),
  gt: (field, value) => gt(field, value),
  gte: (field, value) => gte(field, value),
  contains: (field, value) => like(field, `%${value}%`),
  startsWith: (field, value) => like(field, `${value}%`),
  endsWith: (field, value) => like(field, `%${value}`),
};

/**
 * 执行分页查询
 */
export default async function paginatedQuery<TResult>({ table, params }: {
  table: PgTableWithColumns<TableConfig<any>>;
  params: PaginationParams;
}): Promise<PaginatedResult<TResult>> {
  const { skip = 0, take = 10, where, orderBy } = params;

  // 构建基础查询
  let query = db.select().from(table);

  // 获取表字段
  const tableFields = getTableColumns(table);

  // 如果有where条件，应用
  if (where) {
    query = applyWhereCondition(query, where, tableFields);
  }

  // 如果有排序条件，应用排序
  if (orderBy) {
    query = applyOrderBy(query, orderBy, tableFields);
  }

  // 构建计数查询
  let countQuery = db.select({ value: count() }).from(table);

  // 应用相同的where条件
  if (where) {
    countQuery = applyWhereCondition(countQuery, where, tableFields);
  }

  // 并行执行查询
  const [data, [{ value }]] = await Promise.all([
    query.limit(take).offset(skip),
    countQuery,
  ]);

  return {
    data: data as TResult[],
    meta: {
      total: Number(value),
      skip,
      take,
    },
  };
}

/**
 * 处理where条件
 */
function applyWhereCondition<QueryType extends PgSelectBase<any, any, any>>(
  query: QueryType,
  whereInput: unknown,
  tableFields: Record<string, PgColumn>,
): QueryType {
  if (!whereInput || typeof whereInput !== "object" || Object.keys(whereInput as object).length === 0) {
    return query;
  }

  const input = whereInput as Record<string, unknown>;

  // 处理顶层AND条件
  if ("AND" in input && Array.isArray(input.AND)) {
    for (const condition of input.AND) {
      query = applyWhereCondition(query, condition, tableFields);
    }
    return query;
  }

  // 处理顶层OR条件
  if ("OR" in input && Array.isArray(input.OR)) {
    const orConditions: SQL<unknown>[] = [];
    for (const condition of input.OR) {
      const orSql = buildCondition(condition, tableFields);
      if (orSql)
        orConditions.push(orSql);
    }
    if (orConditions.length > 0) {
      query.where(or(...orConditions));
    }
    return query;
  }

  // 处理NOT条件
  if ("NOT" in input && typeof input.NOT === "object" && input.NOT !== null) {
    const notSql = buildCondition(input.NOT, tableFields);
    if (notSql) {
      query.where(not(notSql));
    }
    return query;
  }

  // 处理其他条件
  const condition = buildCondition(input, tableFields);
  if (condition) {
    query.where(condition);
  }

  return query;
}

/**
 * 构建条件SQL
 */
function buildCondition(
  whereInput: unknown,
  tableFields: Record<string, PgColumn>,
): SQL<unknown> | null {
  if (!whereInput || typeof whereInput !== "object" || Object.keys(whereInput as object).length === 0) {
    return null;
  }

  const input = whereInput as Record<string, unknown>;
  const conditions: SQL<unknown>[] = [];

  for (const [key, value] of Object.entries(input)) {
    // 跳过特殊操作符
    if (["AND", "OR", "NOT"].includes(key))
      continue;

    const field = tableFields[key];
    if (!field)
      continue;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [operator, operatorValue] of Object.entries(value)) {
        const operatorFn = operatorsMap[operator];
        if (operatorFn && isValidWhereValue(operatorValue)) {
          conditions.push(operatorFn(field, operatorValue));
        }
      }
    }
    else if (isValidWhereValue(value)) {
      // 简单相等条件
      conditions.push(eq(field, value));
    }
  }

  if (conditions.length < 1) {
    return null;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions)!;
}

/**
 * 应用排序
 */
function applyOrderBy<QueryType extends PgSelectBase<any, any, any>>(
  query: QueryType,
  orderByInput: unknown,
  tableFields: Record<string, PgColumn>,
): QueryType {
  if (!orderByInput || typeof orderByInput !== "object") {
    return query;
  }

  const orderConditions: SQL<unknown>[] = [];

  if (Array.isArray(orderByInput)) {
    // 处理数组形式的orderBy
    for (const orderItem of orderByInput) {
      if (typeof orderItem === "object" && orderItem !== null) {
        for (const [field, direction] of Object.entries(orderItem)) {
          if (tableFields[field] && (direction === "asc" || direction === "desc")) {
            orderConditions.push(direction === "desc" ? desc(tableFields[field]) : asc(tableFields[field]));
          }
        }
      }
    }
  }
  else {
    // 处理对象形式的orderBy
    for (const [field, direction] of Object.entries(orderByInput)) {
      if (tableFields[field] && (direction === "asc" || direction === "desc")) {
        orderConditions.push(direction === "desc" ? desc(tableFields[field]) : asc(tableFields[field]));
      }
    }
  }

  if (orderConditions.length > 0) {
    query.orderBy(...orderConditions);
  }

  return query;
}

/**
 * 检查值是否为有效的Where条件值
 */
function isValidWhereValue(value: unknown): value is WhereValue {
  if (value === null)
    return true;

  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean")
    return true;

  if (Array.isArray(value)) {
    // 检查数组内的每个元素是否都是有效类型
    return value.every(item =>
      typeof item === "string"
      || typeof item === "number"
      || typeof item === "boolean");
  }

  return false;
}

export * from "./schema";
export * from "./types";
