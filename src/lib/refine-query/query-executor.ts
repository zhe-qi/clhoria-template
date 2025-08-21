import type { SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { and, count } from "drizzle-orm";

import db from "@/db";

import type { RefineQueryParamsType } from "./schemas";
import type {
  BaseRecord,
  QueryExecutionParams,
  RefineQueryResult,
  Result,
} from "./types";

import { convertFiltersToSQL, validateFilterFields } from "./filters";
import { calculatePagination, validatePagination } from "./pagination";
import { addDefaultSorting, convertSortersToSQL, validateSorterFields } from "./sorters";
import { RefineQueryError } from "./types";

/**
 * 查询执行器类
 * 整合过滤、排序、分页功能，执行 Refine 标准查询
 */
export class RefineQueryExecutor<T extends BaseRecord = BaseRecord> {
  private table: PgTable;

  constructor(table: PgTable) {
    this.table = table;
  }

  /**
   * 执行 Refine 查询
   */
  async execute(params: QueryExecutionParams<T>): Promise<Result<RefineQueryResult<T>>> {
    try {
      // 1. 验证参数
      const validationResult = this.validateParams(params);
      if (!validationResult.valid) {
        return [new RefineQueryError(validationResult.errors.join("; ")), null];
      }

      // 2. 构建基础查询条件
      const baseConditions: SQL<unknown>[] = [];

      // 3. 应用过滤条件
      if (params.filters && params.filters.length > 0) {
        const filterSQL = convertFiltersToSQL(params.filters, this.table);
        if (filterSQL) {
          baseConditions.push(filterSQL);
        }
      }

      const whereCondition = baseConditions.length > 0
        ? and(...baseConditions)
        : undefined;

      // 4. 计算分页参数
      const paginationCalc = calculatePagination(params.pagination);

      // 5. 处理排序条件
      let finalSorters = params.sorters;
      if (paginationCalc.mode === "server") {
        // 添加默认排序以确保结果稳定
        finalSorters = addDefaultSorting(params.sorters);
      }
      const orderByClause = convertSortersToSQL(finalSorters, this.table);

      // 6. 执行计数查询
      let total = 0;
      if (paginationCalc.mode === "server") {
        const countQuery = db
          .select({ count: count() })
          .from(this.table);

        if (whereCondition) {
          countQuery.where(whereCondition);
        }

        const countResult = await countQuery;
        total = countResult[0]?.count || 0;
      }

      // 7. 构建数据查询
      let dataQuery = db.select().from(this.table);

      // 应用 WHERE 条件
      if (whereCondition) {
        dataQuery = dataQuery.where(whereCondition) as any;
      }

      // 应用排序
      if (orderByClause.length > 0) {
        dataQuery = dataQuery.orderBy(...orderByClause) as any;
      }

      // 应用分页（仅服务端分页）
      if (paginationCalc.mode === "server") {
        dataQuery = dataQuery
          .limit(paginationCalc.limit)
          .offset(paginationCalc.offset) as any;
      }

      // 8. 执行查询
      const data = await dataQuery as T[];

      // 9. 处理客户端分页
      let finalData = data;
      if (paginationCalc.mode === "client") {
        total = data.length;
        const startIndex = paginationCalc.offset;
        const endIndex = startIndex + paginationCalc.limit;
        finalData = data.slice(startIndex, endIndex);
      }
      else if (paginationCalc.mode === "off") {
        total = data.length;
      }

      const result: RefineQueryResult<T> = {
        data: finalData,
        total,
      };

      return [null, result];
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "查询执行失败";
      return [new RefineQueryError(message), null];
    }
  }

  /**
   * 验证查询参数
   */
  private validateParams(params: QueryExecutionParams<T>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证分页参数
    if (params.pagination) {
      const paginationValidation = validatePagination(params.pagination);
      if (!paginationValidation.valid) {
        errors.push(...paginationValidation.errors);
      }
    }

    // 验证过滤字段
    if (params.filters && params.filters.length > 0) {
      const filterValidation = validateFilterFields(params.filters, this.table);
      if (!filterValidation.valid) {
        errors.push(`无效的过滤字段: ${filterValidation.invalidFields.join(", ")}`);
      }
    }

    // 验证排序字段
    if (params.sorters && params.sorters.length > 0) {
      const sorterValidation = validateSorterFields(params.sorters, this.table);
      if (!sorterValidation.valid) {
        errors.push(`无效的排序字段: ${sorterValidation.invalidFields.join(", ")}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 便捷函数：执行 Refine 查询
 */
export async function executeRefineQuery<T extends BaseRecord = BaseRecord>(
  table: PgTable,
  queryParams: RefineQueryParamsType,
): Promise<Result<RefineQueryResult<T>>> {
  const executor = new RefineQueryExecutor<T>(table);
  return executor.execute({
    resource: table,
    filters: queryParams.filters,
    sorters: queryParams.sorters,
    pagination: {
      current: queryParams.current,
      pageSize: queryParams.pageSize,
      mode: queryParams.mode ?? "server",
    },
  });
}

/**
 * 创建查询执行器工厂
 * 用于创建特定表的查询执行器实例
 */
export function createQueryExecutor<T extends BaseRecord = BaseRecord>(
  table: PgTable,
): RefineQueryExecutor<T> {
  return new RefineQueryExecutor<T>(table);
}

/**
 * 批量查询执行器
 * 用于执行多个相关查询
 */
export class BatchQueryExecutor {
  private queries: Array<{
    name: string;
    executor: RefineQueryExecutor<any>;
    params: QueryExecutionParams<any>;
  }> = [];

  /**
   * 添加查询
   */
  addQuery(
    name: string,
    executor: RefineQueryExecutor<any>,
    params: QueryExecutionParams<any>,
  ): this {
    this.queries.push({ name, executor, params });
    return this;
  }

  /**
   * 执行所有查询
   */
  async executeAll(): Promise<Record<string, RefineQueryResult<any> | RefineQueryError>> {
    const results: Record<string, RefineQueryResult<any> | RefineQueryError> = {};

    for (const query of this.queries) {
      const [error, result] = await query.executor.execute(query.params);
      results[query.name] = error || result!;
    }

    return results;
  }

  /**
   * 并行执行所有查询
   */
  async executeAllParallel(): Promise<Record<string, RefineQueryResult<any> | RefineQueryError>> {
    const promises = this.queries.map(async (query) => {
      const [error, result] = await query.executor.execute(query.params);
      return {
        name: query.name,
        result: error || result!,
      };
    });

    const results = await Promise.all(promises);

    return results.reduce((acc, { name, result }) => {
      acc[name] = result;
      return acc;
    }, {} as Record<string, RefineQueryResult<any> | RefineQueryError>);
  }

  /**
   * 清空查询队列
   */
  clear(): void {
    this.queries = [];
  }
}
