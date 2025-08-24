import type { SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { asc, desc } from "drizzle-orm";

import type { CrudSorting } from "./types";

/**
 * 排序转换器类
 * 将 Refine CrudSorting 转换为 Drizzle ORDER BY 条件
 */
export class SortersConverter {
  private table: PgTable;

  constructor(table: PgTable) {
    this.table = table;
  }

  /**
   * 转换 CrudSorting 为 SQL ORDER BY 条件
   */
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

  /**
   * 转换单个排序条件
   */
  private convertSorter(sorter: CrudSorting[number]): SQL<unknown> | undefined {
    const column = this.getColumn(sorter.field);
    if (!column) {
      console.warn(`Unknown sort field: ${sorter.field}`);
      return undefined;
    }

    try {
      switch (sorter.order) {
        case "asc":
          return asc(column);
        case "desc":
          return desc(column);
        default:
          console.warn(`Invalid sort order: ${sorter.order}`);
          return undefined;
      }
    }
    catch (error) {
      console.error(`Error converting sorter for field ${sorter.field}:`, error);
      return undefined;
    }
  }

  /**
   * 获取表列
   */
  private getColumn(fieldName: string): PgColumn | undefined {
    return (this.table as any)[fieldName];
  }
}

/**
 * 便捷函数：转换排序条件
 * @param sorters CrudSorting 数组
 * @param table 表对象
 * @returns SQL ORDER BY 条件数组
 */
export function convertSortersToSQL(
  sorters: CrudSorting | undefined,
  table: PgTable,
): SQL<unknown>[] {
  if (!sorters)
    return [];

  const converter = new SortersConverter(table);
  return converter.convert(sorters);
}

/**
 * 验证排序字段
 * @param sorters 排序条件数组
 * @param table 表对象
 * @param allowedFields 允许的字段白名单，如果提供则严格验证
 * @returns 验证结果
 */
export function validateSorterFields(
  sorters: CrudSorting,
  table: PgTable,
  allowedFields?: string[],
): { valid: boolean; invalidFields: string[] } {
  // 如果有白名单，使用白名单；否则使用表的所有列
  const validColumns = allowedFields || Object.keys(table);
  const invalidFields = sorters
    .map(sorter => sorter.field)
    .filter(field => !validColumns.includes(field));

  return {
    valid: invalidFields.length === 0,
    invalidFields: [...new Set(invalidFields)],
  };
}

/**
 * 获取排序中使用的所有字段
 * @param sorters 排序条件数组
 * @returns 字段名数组
 */
export function extractSorterFields(sorters: CrudSorting): string[] {
  return [...new Set(sorters.map(sorter => sorter.field))];
}

/**
 * 添加默认排序
 * 如果没有提供排序条件，添加默认的排序（通常按 ID 或创建时间）
 * @param sorters 现有排序条件
 * @param defaultField 默认排序字段
 * @param defaultOrder 默认排序方向
 * @returns 包含默认排序的排序条件
 */
export function addDefaultSorting(
  sorters: CrudSorting | undefined,
  defaultField: string = "createdAt",
  defaultOrder: "asc" | "desc" = "desc",
): CrudSorting {
  const existingSorters = sorters || [];

  // 检查是否已经包含默认字段的排序
  const hasDefaultField = existingSorters.some(sorter => sorter.field === defaultField);

  if (hasDefaultField) {
    return existingSorters;
  }

  return [
    ...existingSorters,
    { field: defaultField, order: defaultOrder },
  ];
}

/**
 * 清理无效的排序条件
 * 移除字段不存在的排序条件
 * @param sorters 排序条件数组
 * @param validFields 有效字段列表
 * @returns 清理后的排序条件
 */
export function sanitizeSorters(
  sorters: CrudSorting,
  validFields: string[],
): CrudSorting {
  return sorters.filter(sorter => validFields.includes(sorter.field));
}

/**
 * 排序优先级处理
 * 某些字段可能需要优先排序（如状态、优先级等）
 * @param sorters 排序条件数组
 * @param priorityFields 优先字段及其默认排序方向
 * @returns 重新排序的排序条件
 */
export function applyPrioritySorting(
  sorters: CrudSorting,
  priorityFields: Record<string, "asc" | "desc">,
): CrudSorting {
  const prioritySorters: CrudSorting = [];
  const remainingSorters: CrudSorting = [];

  // 分离优先字段和其他字段
  for (const sorter of sorters) {
    if (sorter.field in priorityFields) {
      prioritySorters.push(sorter);
    }
    else {
      remainingSorters.push(sorter);
    }
  }

  // 添加未指定但需要优先的字段
  for (const [field, order] of Object.entries(priorityFields)) {
    if (!prioritySorters.some(s => s.field === field)) {
      prioritySorters.unshift({ field, order });
    }
  }

  return [...prioritySorters, ...remainingSorters];
}
