import type {
  SQL,
} from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Writable } from "type-fest";

import { and, between, eq, gt, gte, ilike, inArray, isNotNull, isNull, like, lt, lte, ne, not, notInArray, or, sql } from "drizzle-orm";

import logger from "@/lib/logger";

import type { ConditionalFilter, CrudFilters, LogicalFilter } from "./schemas";

/**
 * 过滤器转换器类
 * 将 Refine CrudFilters 转换为 Drizzle SQL 条件
 */
export class FiltersConverter {
  private table: PgTable;

  constructor(table: PgTable) {
    this.table = table;
  }

  /**
   * 转换 CrudFilters 为 SQL 条件
   */
  convert(filters?: CrudFilters): SQL<unknown> | undefined {
    if (!filters || filters.length === 0)
      return undefined;

    const conditions = filters.map(filter => this.convertFilter(filter));
    const validConditions = conditions.filter(Boolean) as SQL<unknown>[];

    if (validConditions.length === 0)
      return undefined;
    if (validConditions.length === 1)
      return validConditions[0];

    return and(...validConditions);
  }

  /**
   * 转换单个过滤器
   */
  private convertFilter(filter: CrudFilters[number]): SQL<unknown> | undefined {
    if (this.isConditionalFilter(filter)) {
      return this.convertConditionalFilter(filter);
    }
    else {
      return this.convertLogicalFilter(filter);
    }
  }

  /**
   * 转换逻辑过滤器（字段级别）
   */
  private convertLogicalFilter(filter: LogicalFilter): SQL<unknown> | undefined {
    const column = this.getColumn(filter.field);
    if (!column) {
      logger.warn({ field: filter.field }, "[查询过滤]: 未知字段");
      return undefined;
    }

    const { operator, value } = filter;

    // 处理空值情况
    if ((value === null || value === undefined) && !["null", "nnull"].includes(operator)) {
      return undefined;
    }

    try {
      switch (operator) {
        // 相等性操作符
        case "eq":
          return eq(column, value);
        case "ne":
          return ne(column, value);

        // 比较操作符
        case "lt":
          return lt(column, value);
        case "gt":
          return gt(column, value);
        case "lte":
          return lte(column, value);
        case "gte":
          return gte(column, value);

        // 数组操作符
        case "in":
          return Array.isArray(value) && value.length > 0 ? inArray(column, value) : undefined;
        case "nin":
          return Array.isArray(value) && value.length > 0 ? notInArray(column, value) : undefined;

        // 字符串操作符（不区分大小写）
        case "contains":
          return typeof value === "string" ? ilike(column, `%${value}%`) : undefined;
        case "ncontains":
          return typeof value === "string" ? not(ilike(column, `%${value}%`)) : undefined;

        // 字符串操作符（区分大小写）
        case "containss":
          return typeof value === "string" ? like(column, `%${value}%`) : undefined;
        case "ncontainss":
          return typeof value === "string" ? not(like(column, `%${value}%`)) : undefined;

        // 字符串匹配操作符（不区分大小写）
        case "startswith":
          return typeof value === "string" ? ilike(column, `${value}%`) : undefined;
        case "nstartswith":
          return typeof value === "string" ? not(ilike(column, `${value}%`)) : undefined;
        case "endswith":
          return typeof value === "string" ? ilike(column, `%${value}`) : undefined;
        case "nendswith":
          return typeof value === "string" ? not(ilike(column, `%${value}`)) : undefined;

        // 字符串匹配操作符（区分大小写）
        case "startswiths":
          return typeof value === "string" ? like(column, `${value}%`) : undefined;
        case "nstartswiths":
          return typeof value === "string" ? not(like(column, `${value}%`)) : undefined;
        case "endswiths":
          return typeof value === "string" ? like(column, `%${value}`) : undefined;
        case "nendswiths":
          return typeof value === "string" ? not(like(column, `%${value}`)) : undefined;

        // 范围操作符
        case "between":
          if (Array.isArray(value) && value.length === 2) {
            return between(column, value[0], value[1]);
          }
          return undefined;
        case "nbetween":
          if (Array.isArray(value) && value.length === 2) {
            return not(between(column, value[0], value[1]));
          }
          return undefined;

        // 空值操作符
        case "null":
          return isNull(column);
        case "nnull":
          return isNotNull(column);

        // 数组包含操作符（PostgreSQL 特有）
        case "ina":
          // 检查列是否包含数组中的所有元素
          if (Array.isArray(value) && value.length > 0) {
            // 使用参数化查询，防止SQL注入
            return sql`${column} @> ${value}::jsonb`;
          }
          return undefined;
        case "nina":
          // 检查列是否不包含数组中的所有元素
          if (Array.isArray(value) && value.length > 0) {
            return not(sql`${column} @> ${value}::jsonb`);
          }
          return undefined;

        default:
          logger.warn({ operator }, "[查询过滤]: 不支持的操作符");
          return undefined;
      }
    }
    catch (error) {
      logger.error({ field: filter.field, error: error instanceof Error ? error.message : String(error) }, "[查询过滤]: 转换过滤器错误");
      return undefined;
    }
  }

  /**
   * 转换条件过滤器（逻辑组合）
   */
  private convertConditionalFilter(filter: ConditionalFilter): SQL<unknown> | undefined {
    const { operator, value } = filter;

    if (!Array.isArray(value) || value.length === 0) {
      return undefined;
    }

    const conditions = value
      .map(subFilter => this.convertFilter(subFilter))
      .filter(Boolean) as SQL<unknown>[];

    if (conditions.length === 0)
      return undefined;
    if (conditions.length === 1)
      return conditions[0];

    switch (operator) {
      case "and":
        return and(...conditions);
      case "or":
        return or(...conditions);
      default:
        logger.warn({ operator }, "[查询过滤]: 不支持的条件操作符");
        return undefined;
    }
  }

  /**
   * 获取表列
   */
  private getColumn(fieldName: string): PgColumn | undefined {
    // 使用 type-fest Writable 类型进行更安全的类型处理
    const tableColumns = this.table as unknown as Writable<Record<string, PgColumn>>;
    if (fieldName in tableColumns) {
      return tableColumns[fieldName];
    }
    return undefined;
  }

  /**
   * 类型守卫：检查是否为条件过滤器
   */
  private isConditionalFilter(filter: CrudFilters[number]): filter is ConditionalFilter {
    return "operator" in filter && ["or", "and"].includes(filter.operator);
  }
}

/** 便捷函数：转换过滤器 */
export function convertFiltersToSQL(
  filters: CrudFilters | undefined,
  table: PgTable,
): SQL<unknown> | undefined {
  if (!filters)
    return undefined;

  const converter = new FiltersConverter(table);
  return converter.convert(filters);
}

/** 验证过滤器字段 */
export function validateFilterFields(
  filters: CrudFilters,
  table: PgTable,
  allowedFields?: readonly string[],
): Readonly<{ valid: boolean; invalidFields: readonly string[] }> {
  const tableColumns = Object.keys(table);
  // 如果提供了白名单，严格使用白名单
  const validColumns = allowedFields ? [...allowedFields] : tableColumns;
  const invalidFields: string[] = [];

  // 记录访问敏感字段的尝试
  const sensitiveFields = ["password", "secret", "token", "key"] as const;

  function checkFilter(filter: CrudFilters[number]) {
    if ("field" in filter) {
      const field = filter.field;

      // 检查是否尝试访问敏感字段
      if (sensitiveFields.some(sf => field.toLowerCase().includes(sf))) {
        logger.warn({ field }, "[查询过滤]: 尝试访问敏感字段");
      }

      if (!validColumns.includes(field)) {
        invalidFields.push(field);
      }
    }
    else if ("value" in filter && Array.isArray(filter.value)) {
      // ConditionalFilter
      filter.value.forEach(checkFilter);
    }
  }

  filters.forEach(checkFilter);

  return {
    valid: invalidFields.length === 0,
    invalidFields: [...new Set(invalidFields)],
  };
}

/** 获取过滤器中使用的所有字段 */
export function extractFilterFields(filters: CrudFilters): readonly string[] {
  const fields: string[] = [];

  function extractFromFilter(filter: CrudFilters[number]) {
    if ("field" in filter) {
      fields.push(filter.field);
    }
    else if ("value" in filter && Array.isArray(filter.value)) {
      filter.value.forEach(extractFromFilter);
    }
  }

  filters.forEach(extractFromFilter);

  return [...new Set(fields)];
}
