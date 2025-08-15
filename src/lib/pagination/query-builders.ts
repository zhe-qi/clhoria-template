import type { SQL } from "drizzle-orm";
import type { PgTable, SelectedFields } from "drizzle-orm/pg-core";

import { and, asc, count, desc, eq, getTableColumns, gt, gte, inArray, like, lt, lte, not, or } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

import db from "@/db";

import type {
  JoinCondition,
  OperatorMap,
  QueryContext,
  QuerySelectBuilderModeType,
  QuerySource,
  QuerySourceWithoutReturningClause,
  TableFieldsType,
  ToResult,
  ValidatedParams,
} from "./types";

import { QueryError } from "./types";
import { isValidWhereValue, validateOrderBy, validateWhereCondition } from "./validators";

// 操作符映射
const operatorsMap: OperatorMap = {
  equals: (field, value) => eq(field, value),
  not: (field, value) => not(eq(field, value)),
  in: (field, value) => inArray(field, value as unknown[]),
  notIn: (field, value) => not(inArray(field, value as unknown[])),
  lt: (field, value) => lt(field, value),
  lte: (field, value) => lte(field, value),
  gt: (field, value) => gt(field, value),
  gte: (field, value) => gte(field, value),
  contains: (field, value) => like(field, `%${value}%`),
  startsWith: (field, value) => like(field, `${value}%`),
  endsWith: (field, value) => like(field, `%${value}`),
};

/**
 * 构建查询上下文
 */
export function buildQueryContext(
  table: QuerySourceWithoutReturningClause<QuerySource>,
  joinTables?: Record<string, PgTable>,
  domain?: string,
): QueryContext {
  const tableFields = getTableColumns(table as PgTable);
  const tableAliases: Record<string, string> = {};

  return {
    table,
    joinTables,
    domain,
    tableFields,
    tableAliases,
  };
}

/**
 * 应用 Join 查询 - 简化类型处理
 */
export function applyJoin<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>>(
  query: QueryType,
  joinTable: PgTable,
  joinCondition: JoinCondition,
  leftTableFields: TableFieldsType,
  joinTableFields: TableFieldsType,
): QueryType {
  const { type = "left", on } = joinCondition;

  if (!on || typeof on !== "object") {
    return query;
  }

  // 构建 join 条件
  const joinConditions: SQL<unknown>[] = [];

  for (const [leftField, rightField] of Object.entries(on)) {
    if (typeof leftField === "string" && typeof rightField === "string"
      && leftTableFields[leftField] && joinTableFields[rightField]) {
      joinConditions.push(eq(leftTableFields[leftField], joinTableFields[rightField]));
    }
  }

  if (joinConditions.length === 0) {
    return query;
  }

  const joinConditionSQL = joinConditions.length === 1
    ? joinConditions[0]
    : and(...joinConditions);

  // 简化类型处理，避免复杂的联合类型
  let result: unknown;
  switch (type) {
    case "left":
      result = query.leftJoin(joinTable, joinConditionSQL);
      break;
    case "inner":
      result = query.innerJoin(joinTable, joinConditionSQL);
      break;
    case "right":
      result = query.rightJoin(joinTable, joinConditionSQL);
      break;
    case "full":
      result = query.fullJoin(joinTable, joinConditionSQL);
      break;
    default:
      result = query.leftJoin(joinTable, joinConditionSQL);
      break;
  }

  return result as QueryType;
}

/**
 * 应用 join 查询到基础查询
 */
export function applyJoinsToQuery<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>>(
  baseQuery: QueryType,
  validatedParams: ValidatedParams,
  context: QueryContext,
): ToResult<[QueryType, Record<string, string>]> {
  if (!context.joinTables || !validatedParams.join) {
    return [null, [baseQuery, {}]];
  }

  let query = baseQuery;
  const tableAliases = { ...context.tableAliases };

  try {
    for (const [tableName, joinCondition] of Object.entries(validatedParams.join)) {
      const joinTable: PgTable | undefined = context.joinTables[tableName];

      if (!joinTable) {
        const error = new QueryError(`连接表 ${tableName} 不在允许的表列表中`);
        return [error, null];
      }

      const joinTableFields = getTableColumns(joinTable);
      query = applyJoin(query, joinTable, joinCondition, context.tableFields, joinTableFields);

      if (joinCondition.as) {
        const joinTableConfig: { name?: string } = getTableConfig(joinTable);
        const actualTableName = joinTableConfig.name;
        if (actualTableName) {
          tableAliases[actualTableName] = joinCondition.as;
        }
      }
    }

    return [null, [query, tableAliases]];
  }
  catch (error) {
    const queryError = new QueryError(`应用 join 查询失败: ${error instanceof Error ? error.message : String(error)}`);
    return [queryError, null];
  }
}

/**
 * 构建条件SQL - 纯函数版本，无副作用
 */
export function buildCondition(whereInput: unknown, tableFields: TableFieldsType): SQL<unknown> | null {
  if (!whereInput || typeof whereInput !== "object" || Reflect.ownKeys(whereInput).length < 1) {
    return null;
  }

  const conditions: SQL<unknown>[] = [];

  for (const [key, value] of Object.entries(whereInput)) {
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
 * 处理where条件 - 纯函数版本，无副作用
 */
export function applyWhereCondition<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>>(
  query: QueryType,
  whereInput: unknown,
  tableFields: TableFieldsType,
): QueryType {
  if (!whereInput || typeof whereInput !== "object" || Reflect.ownKeys(whereInput).length < 1) {
    return query;
  }

  // 处理顶层AND条件
  if ("AND" in whereInput && Array.isArray(whereInput.AND)) {
    for (const condition of whereInput.AND) {
      query = applyWhereCondition(query, condition, tableFields);
    }
    return query;
  }

  // 处理顶层OR条件
  if ("OR" in whereInput && Array.isArray(whereInput.OR)) {
    const orConditions: SQL<unknown>[] = [];
    for (const condition of whereInput.OR) {
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
  if ("NOT" in whereInput && typeof whereInput.NOT === "object" && whereInput.NOT !== null) {
    const notSql = buildCondition(whereInput.NOT, tableFields);
    if (notSql) {
      query.where(not(notSql));
    }
    return query;
  }

  // 处理其他条件
  const condition = buildCondition(whereInput, tableFields);
  if (condition) {
    query.where(condition);
  }

  return query;
}

/**
 * 应用过滤条件到查询
 */
export function applyFiltersToQuery<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>>(
  query: QueryType,
  validatedParams: ValidatedParams,
  context: QueryContext,
): ToResult<QueryType> {
  if (!validatedParams.where) {
    return [null, query];
  }

  const [whereError, validWhere] = validateWhereCondition(validatedParams.where, context.domain);
  if (whereError) {
    return [whereError, null];
  }

  try {
    const filteredQuery = applyWhereCondition(query, validWhere, context.tableFields);
    return [null, filteredQuery];
  }
  catch (error) {
    const queryError = new QueryError(`应用过滤条件失败: ${error instanceof Error ? error.message : String(error)}`);
    return [queryError, null];
  }
}

/**
 * 应用排序 - 纯函数版本，无副作用
 */
export function applyOrderBy<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>>(
  query: QueryType,
  orderByInput: unknown,
  tableFields: TableFieldsType,
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
 * 应用排序到查询
 */
export function applySortingToQuery<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>>(
  query: QueryType,
  validatedParams: ValidatedParams,
  context: QueryContext,
): ToResult<QueryType> {
  if (!validatedParams.orderBy) {
    return [null, query];
  }

  const [orderByError, validOrderBy] = validateOrderBy(validatedParams.orderBy);
  if (orderByError) {
    return [orderByError, null];
  }

  try {
    const sortedQuery = applyOrderBy(query, validOrderBy, context.tableFields);
    return [null, sortedQuery];
  }
  catch (error) {
    const queryError = new QueryError(`应用排序失败: ${error instanceof Error ? error.message : String(error)}`);
    return [queryError, null];
  }
}

/**
 * 构建计数查询
 */
export function buildCountQuery(
  validatedParams: ValidatedParams,
  context: QueryContext,
): ToResult<unknown> {
  try {
    const baseCountQuery = db.select({ value: count() }).from(context.table);

    if (validatedParams.where) {
      const [filterError, filteredCountQuery] = applyFiltersToQuery(baseCountQuery, validatedParams, context);
      if (filterError) {
        return [filterError, null];
      }
      return [null, filteredCountQuery];
    }

    return [null, baseCountQuery];
  }
  catch (error) {
    const queryError = new QueryError(`构建计数查询失败: ${error instanceof Error ? error.message : String(error)}`);
    return [queryError, null];
  }
}
