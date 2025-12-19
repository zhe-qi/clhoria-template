import type { SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Writable } from "type-fest";

import { and, asc, between, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, like, lt, lte, ne, not, notInArray, or, sql } from "drizzle-orm";

import logger from "@/lib/logger";

import type { ConditionalFilter, CrudFilters, CrudSorting, LogicalFilter } from "./schemas";

// ============================================================================
// 过滤器转换器
// ============================================================================

/**
 * 过滤器转换器类
 * 将 Refine CrudFilters 转换为 Drizzle SQL 条件
 */
export class FiltersConverter {
  private table: PgTable;

  constructor(table: PgTable) {
    this.table = table;
  }

  /** 转换 CrudFilters 为 SQL 条件 */
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

  private convertFilter(filter: CrudFilters[number]): SQL<unknown> | undefined {
    if (this.isConditionalFilter(filter)) {
      return this.convertConditionalFilter(filter);
    }
    return this.convertLogicalFilter(filter);
  }

  private convertLogicalFilter(filter: LogicalFilter): SQL<unknown> | undefined {
    const column = this.getColumn(filter.field);
    if (!column) {
      logger.warn({ field: filter.field }, "[查询过滤]: 未知字段");
      return undefined;
    }

    const { operator, value } = filter;

    if ((value === null || value === undefined) && !["null", "nnull"].includes(operator)) {
      return undefined;
    }

    try {
      switch (operator) {
        case "eq":
          return eq(column, value);
        case "ne":
          return ne(column, value);
        case "lt":
          return lt(column, value);
        case "gt":
          return gt(column, value);
        case "lte":
          return lte(column, value);
        case "gte":
          return gte(column, value);
        case "in":
          return Array.isArray(value) && value.length > 0 ? inArray(column, value) : undefined;
        case "nin":
          return Array.isArray(value) && value.length > 0 ? notInArray(column, value) : undefined;
        case "contains":
          return typeof value === "string" ? ilike(column, `%${value}%`) : undefined;
        case "ncontains":
          return typeof value === "string" ? not(ilike(column, `%${value}%`)) : undefined;
        case "containss":
          return typeof value === "string" ? like(column, `%${value}%`) : undefined;
        case "ncontainss":
          return typeof value === "string" ? not(like(column, `%${value}%`)) : undefined;
        case "startswith":
          return typeof value === "string" ? ilike(column, `${value}%`) : undefined;
        case "nstartswith":
          return typeof value === "string" ? not(ilike(column, `${value}%`)) : undefined;
        case "endswith":
          return typeof value === "string" ? ilike(column, `%${value}`) : undefined;
        case "nendswith":
          return typeof value === "string" ? not(ilike(column, `%${value}`)) : undefined;
        case "startswiths":
          return typeof value === "string" ? like(column, `${value}%`) : undefined;
        case "nstartswiths":
          return typeof value === "string" ? not(like(column, `${value}%`)) : undefined;
        case "endswiths":
          return typeof value === "string" ? like(column, `%${value}`) : undefined;
        case "nendswiths":
          return typeof value === "string" ? not(like(column, `%${value}`)) : undefined;
        case "between":
          return Array.isArray(value) && value.length === 2 ? between(column, value[0], value[1]) : undefined;
        case "nbetween":
          return Array.isArray(value) && value.length === 2 ? not(between(column, value[0], value[1])) : undefined;
        case "null":
          return isNull(column);
        case "nnull":
          return isNotNull(column);
        case "ina":
          return Array.isArray(value) && value.length > 0 ? sql`${column} @> ${value}::jsonb` : undefined;
        case "nina":
          return Array.isArray(value) && value.length > 0 ? not(sql`${column} @> ${value}::jsonb`) : undefined;
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

  private getColumn(fieldName: string): PgColumn | undefined {
    const tableColumns = this.table as unknown as Writable<Record<string, PgColumn>>;
    return fieldName in tableColumns ? tableColumns[fieldName] : undefined;
  }

  private isConditionalFilter(filter: CrudFilters[number]): filter is ConditionalFilter {
    return "operator" in filter && ["or", "and"].includes(filter.operator);
  }
}

/** 便捷函数：转换过滤器 */
export function convertFiltersToSQL(filters: CrudFilters | undefined, table: PgTable): SQL<unknown> | undefined {
  if (!filters)
    return undefined;
  return new FiltersConverter(table).convert(filters);
}

/** 验证过滤器字段 */
export function validateFilterFields(
  filters: CrudFilters,
  table: PgTable,
  allowedFields?: readonly string[],
): Readonly<{ valid: boolean; invalidFields: readonly string[] }> {
  const validColumns = allowedFields ? [...allowedFields] : Object.keys(table);
  const invalidFields: string[] = [];

  function checkFilter(filter: CrudFilters[number]) {
    if ("field" in filter) {
      if (!validColumns.includes(filter.field)) {
        invalidFields.push(filter.field);
      }
    }
    else if ("value" in filter && Array.isArray(filter.value)) {
      filter.value.forEach(checkFilter);
    }
  }

  filters.forEach(checkFilter);
  return { valid: invalidFields.length === 0, invalidFields: [...new Set(invalidFields)] };
}

// ============================================================================
// 排序转换器
// ============================================================================

/**
 * 排序转换器类
 * 将 Refine CrudSorting 转换为 Drizzle ORDER BY 条件
 */
export class SortersConverter {
  private table: PgTable;

  constructor(table: PgTable) {
    this.table = table;
  }

  /** 转换 CrudSorting 为 SQL ORDER BY 条件 */
  convert(sorters?: CrudSorting): SQL<unknown>[] {
    if (!sorters || sorters.length === 0) {
      return [];
    }

    const orderByClauses: SQL<unknown>[] = [];
    for (const sorter of sorters) {
      const clause = this.convertSorter(sorter);
      if (clause) {
        orderByClauses.push(clause);
      }
    }
    return orderByClauses;
  }

  private convertSorter(sorter: CrudSorting[number]): SQL<unknown> | undefined {
    const column = this.getColumn(sorter.field);
    if (!column) {
      logger.warn({ field: sorter.field }, "[查询排序]: 未知排序字段");
      return undefined;
    }

    try {
      switch (sorter.order) {
        case "asc":
          return asc(column);
        case "desc":
          return desc(column);
        default:
          logger.warn({ order: sorter.order }, "[查询排序]: 无效的排序方向");
          return undefined;
      }
    }
    catch (error) {
      logger.error({ field: sorter.field, error: error instanceof Error ? error.message : String(error) }, "[查询排序]: 转换排序条件错误");
      return undefined;
    }
  }

  private getColumn(fieldName: string): PgColumn | undefined {
    const tableColumns = this.table as unknown as Writable<Record<string, PgColumn>>;
    return fieldName in tableColumns ? tableColumns[fieldName] : undefined;
  }
}

/** 便捷函数：转换排序条件 */
export function convertSortersToSQL(sorters: CrudSorting | undefined, table: PgTable): SQL<unknown>[] {
  if (!sorters)
    return [];
  return new SortersConverter(table).convert(sorters);
}

/** 验证排序字段 */
export function validateSorterFields(
  sorters: CrudSorting,
  table: PgTable,
  allowedFields?: readonly string[],
): Readonly<{ valid: boolean; invalidFields: readonly string[] }> {
  const validColumns = allowedFields ? [...allowedFields] : Object.keys(table);
  const invalidFields = sorters
    .map(sorter => sorter.field)
    .filter(field => !validColumns.includes(field));

  return { valid: invalidFields.length === 0, invalidFields: [...new Set(invalidFields)] };
}

/** 添加默认排序 */
export function addDefaultSorting(
  sorters: CrudSorting | undefined,
  defaultField: string = "createdAt",
  defaultOrder: "asc" | "desc" = "desc",
): CrudSorting {
  const existingSorters = sorters || [];
  const hasDefaultField = existingSorters.some(sorter => sorter.field === defaultField);

  if (hasDefaultField) {
    return existingSorters;
  }

  return [...existingSorters, { field: defaultField, order: defaultOrder }];
}
