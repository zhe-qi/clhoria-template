import type { SQL } from "drizzle-orm";
import type { PgTable, SelectedFields } from "drizzle-orm/pg-core";

import { and, asc, count, desc, eq, getTableColumns, gt, gte, inArray, like, lt, lte, not, or } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

import db from "@/db";
import { formatJoinResults } from "@/utils/tools/format-result";

import type { JoinCondition, OperatorMap, PaginatedResult, PaginationParams, QuerySelectBuilderModeType, QuerySource, QuerySourceWithoutReturningClause, TableFieldsType, ToResult } from "./types";

import { OrderBySchema, PaginationParamsSchema, WhereConditionSchema } from "./schema";

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
 * 执行分页查询，传入声明式参数，返回分页结果
 * @returns 返回元组 [error, result]，互斥关系：有 error 时 result 为 null，无 error 时 result 非空
 */
export default async function paginatedQuery<TResult>({ table, params, joinTables }: {
  /** 主表 */
  table: QuerySourceWithoutReturningClause<QuerySource>;
  /** 分页参数 */
  params: PaginationParams;
  /** 联表查询白名单 */
  joinTables?: Record<string, PgTable>;
}): Promise<ToResult<PaginatedResult<TResult>>> {
  try {
    // 验证参数
    const validatedParams = PaginationParamsSchema.parse(params);
    const { skip = 0, take = 10, where, orderBy, join } = validatedParams;

    // 构建基础查询
    let query = db.select().from(table);

    // 获取表字段
    const tableFields = getTableColumns(table as PgTable);

    // 收集表别名
    const tableAliases: Record<string, string> = {};

    // 应用 join 查询
    if (joinTables && join) {
      // 为每个连接表应用 join
      for (const [tableName, joinCondition] of Object.entries(join)) {
        const joinTable = joinTables[tableName];

        // 只处理存在于 joinTables 中的表
        if (joinTable) {
          const joinTableFields = getTableColumns(joinTable);
          query = applyJoin(query, joinTable, joinCondition, tableFields, joinTableFields);

          // 如果有设置别名，记录到映射中
          if (joinCondition.as) {
            const joinTableConfig = getTableConfig(joinTable);
            const actualTableName = joinTableConfig.name;
            if (actualTableName) {
              tableAliases[actualTableName] = joinCondition.as;
            }
          }
        }
        else {
          const error = new Error(`连接表 ${tableName} 不在允许的表列表中`);
          return [error, null] as const;
        }
      }
    }

    // 如果有where条件，应用
    if (where) {
      // 验证 where 条件
      const validWhere = WhereConditionSchema.safeParse(where);
      if (validWhere.success) {
        query = applyWhereCondition(query, validWhere.data, tableFields);
      }
      else {
        const error = new Error(`无效的 where 条件: ${validWhere.error.message}`);
        return [error, null] as const;
      }
    }

    // 如果有排序条件，应用排序
    if (orderBy) {
      // 验证排序条件
      const validOrderBy = OrderBySchema.safeParse(orderBy);
      if (validOrderBy.success) {
        query = applyOrderBy(query, validOrderBy.data, tableFields);
      }
      else {
        const error = new Error(`无效的 orderBy 条件: ${validOrderBy.error.message}`);
        return [error, null] as const;
      }
    }

    // 构建计数查询
    let countQuery = db.select({ value: count() }).from(table);

    // 应用相同的where条件
    if (where && WhereConditionSchema.safeParse(where).success) {
      countQuery = applyWhereCondition(countQuery, where, tableFields);
    }

    // 并行执行查询
    const [data, [{ value: total }]] = await Promise.all([
      query.limit(take).offset(skip),
      countQuery,
    ]);

    // 格式化结果（如果需要）
    let resultData = data as TResult[];
    if (joinTables && join) {
      const tableConfig = getTableConfig(table as PgTable);
      const mainTableName = tableConfig.name;
      if (mainTableName) {
        resultData = formatJoinResults<TResult>(data, mainTableName, tableAliases);
      }
    }

    const result = {
      data: resultData,
      meta: { total, skip, take },
    };

    return [null, result] as const;
  }
  catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return [err, null] as const;
  }
}

/**
 * 应用 Join 查询
 */
function applyJoin<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>>(
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

  // 应用不同类型的 join
  switch (type) {
    case "left":
      return query.leftJoin(joinTable, joinConditionSQL) as unknown as QueryType;
    case "inner":
      return query.innerJoin(joinTable, joinConditionSQL) as unknown as QueryType;
    case "right":
      return query.rightJoin(joinTable, joinConditionSQL) as unknown as QueryType;
    case "full":
      return query.fullJoin(joinTable, joinConditionSQL) as unknown as QueryType;
    default:
      return query.leftJoin(joinTable, joinConditionSQL) as unknown as QueryType;
  }
}

/**
 * 处理where条件
 */
function applyWhereCondition<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>,
>(query: QueryType, whereInput: unknown, tableFields: TableFieldsType): QueryType {
  if (!whereInput || typeof whereInput !== "object" || Reflect.ownKeys(whereInput).length < 1) {
    return query;
  }

  try {
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
  catch (error) {
    console.error("Error applying where condition:", error);
    return query; // 发生错误时返回未修改的查询
  }
}

/**
 * 构建条件SQL
 */
function buildCondition(whereInput: unknown, tableFields: TableFieldsType): SQL<unknown> | null {
  if (!whereInput || typeof whereInput !== "object" || Reflect.ownKeys(whereInput).length < 1) {
    return null;
  }

  try {
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
          else {
            console.warn(`不支持的操作符 ${operator} 或无效的值`);
          }
        }
      }
      else if (isValidWhereValue(value)) {
        // 简单相等条件
        conditions.push(eq(field, value));
      }
      else {
        console.warn(`字段 ${key} 的值无效`);
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
  catch (error) {
    console.error("Error building condition:", error);
    return null; // 发生错误时返回 null
  }
}

/**
 * 应用排序
 */
function applyOrderBy<QueryType extends QuerySelectBuilderModeType<SelectedFields | undefined>,
>(query: QueryType, orderByInput: unknown, tableFields: TableFieldsType): QueryType {
  if (!orderByInput || typeof orderByInput !== "object") {
    return query;
  }

  try {
    const orderConditions: SQL<unknown>[] = [];

    if (Array.isArray(orderByInput)) {
      // 处理数组形式的orderBy
      for (const orderItem of orderByInput) {
        if (typeof orderItem === "object" && orderItem !== null) {
          for (const [field, direction] of Object.entries(orderItem)) {
            if (tableFields[field] && (direction === "asc" || direction === "desc")) {
              orderConditions.push(direction === "desc" ? desc(tableFields[field]) : asc(tableFields[field]));
            }
            else {
              console.warn(`无效的排序: 字段 ${field} 不存在或方向 ${direction} 不是 asc/desc`);
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
        else {
          console.warn(`无效的排序: 字段 ${field} 不存在或方向 ${direction} 不是 asc/desc`);
        }
      }
    }

    if (orderConditions.length > 0) {
      query.orderBy(...orderConditions);
    }

    return query;
  }
  catch (error) {
    console.error("Error applying order by:", error);
    return query; // 发生错误时返回未修改的查询
  }
}

/**
 * 检查值是否为有效的Where条件值
 */
function isValidWhereValue(value: unknown): value is unknown {
  try {
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
  catch (error) {
    console.error("Error validating where value:", error);
    return false; // 发生错误时返回 false
  }
}

export * from "./schema";
export * from "./types";
