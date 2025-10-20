import type { SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Simplify, UnknownRecord } from "type-fest";

import { and, count } from "drizzle-orm";

import db from "@/db";

import type { PaginationCalculation } from "./pagination";
import type {
  JoinConfig,
  QueryExecutionParams,
  RefineQueryConfig,
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
export class RefineQueryExecutor<T extends UnknownRecord = UnknownRecord> {
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

      // 6. 根据是否有 Join 配置选择不同的查询方式
      if (params.joinConfig) {
        return await this.executeJoinQuery(params, whereCondition, orderByClause, paginationCalc);
      }
      else {
        return await this.executeSimpleQuery(whereCondition, orderByClause, paginationCalc);
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "查询执行失败";
      return [new RefineQueryError(message), null];
    }
  }

  /**
   * 执行简单查询(原有逻辑)
   */
  private async executeSimpleQuery(
    whereCondition: SQL<unknown> | undefined,
    orderByClause: SQL<unknown>[],
    paginationCalc: PaginationCalculation,
  ): Promise<Result<RefineQueryResult<T>>> {
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

  /**
   * 执行 Join 查询
   */
  private async executeJoinQuery(
    params: QueryExecutionParams<T>,
    whereCondition: SQL<unknown> | undefined,
    orderByClause: SQL<unknown>[],
    paginationCalc: PaginationCalculation,
  ): Promise<Result<RefineQueryResult<T>>> {
    const { joinConfig } = params;
    if (!joinConfig) {
      throw new Error("Join config is required");
    }

    // 6. 执行计数查询
    let total = 0;
    if (paginationCalc.mode === "server") {
      let countQuery = this.buildJoinCountQuery(joinConfig);

      if (whereCondition) {
        countQuery = countQuery.where(whereCondition) as any;
      }

      // 如果有 groupBy，需要使用子查询计数
      if (joinConfig.groupBy && joinConfig.groupBy.length > 0) {
        countQuery = countQuery.groupBy(...joinConfig.groupBy) as any;
        const countResult = await countQuery;
        total = countResult.length;
      }
      else {
        const countResult = await countQuery;
        total = countResult[0]?.count || 0;
      }
    }

    // 7. 构建 Join 数据查询
    let dataQuery = this.buildJoinQuery(joinConfig);

    // 应用 WHERE 条件
    if (whereCondition) {
      dataQuery = dataQuery.where(whereCondition) as any;
    }

    // 应用 GROUP BY
    if (joinConfig.groupBy && joinConfig.groupBy.length > 0) {
      dataQuery = dataQuery.groupBy(...joinConfig.groupBy) as any;
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

  /**
   * 验证查询参数
   */
  private validateParams(params: QueryExecutionParams<T>): Readonly<{ valid: boolean; errors: readonly string[] }> {
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
      const allowedFieldsArray = params.allowedFields ? [...params.allowedFields] : undefined;
      const filterValidation = validateFilterFields(params.filters, this.table, allowedFieldsArray);
      if (!filterValidation.valid) {
        errors.push(`无效的过滤字段: ${filterValidation.invalidFields.join(", ")}`);
      }
    }

    // 验证排序字段
    if (params.sorters && params.sorters.length > 0) {
      const allowedFieldsArray = params.allowedFields ? [...params.allowedFields] : undefined;
      const sorterValidation = validateSorterFields(params.sorters, this.table, allowedFieldsArray);
      if (!sorterValidation.valid) {
        errors.push(`无效的排序字段: ${sorterValidation.invalidFields.join(", ")}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 构建 Join 查询
   */
  private buildJoinQuery(joinConfig: JoinConfig) {
    let query = db.select(joinConfig.selectFields || {}).from(this.table);

    // 应用所有 joins
    for (const join of joinConfig.joins) {
      switch (join.type) {
        case "left":
          query = query.leftJoin(join.table, join.on) as any;
          break;
        case "right":
          query = query.rightJoin(join.table, join.on) as any;
          break;
        case "inner":
        default:
          query = query.innerJoin(join.table, join.on) as any;
          break;
      }
    }

    return query;
  }

  /**
   * 构建 Join 计数查询
   */
  private buildJoinCountQuery(joinConfig: JoinConfig) {
    let query = db.select({ count: count() }).from(this.table);

    // 应用所有 joins
    for (const join of joinConfig.joins) {
      switch (join.type) {
        case "left":
          query = query.leftJoin(join.table, join.on) as any;
          break;
        case "right":
          query = query.rightJoin(join.table, join.on) as any;
          break;
        case "inner":
        default:
          query = query.innerJoin(join.table, join.on) as any;
          break;
      }
    }

    return query;
  }
}

/**
 * 便捷函数：执行 Refine 查询（新版本，支持配置对象）
 */
export async function executeRefineQuery<T extends UnknownRecord = UnknownRecord>(
  config: RefineQueryConfig<T>,
): Promise<Result<RefineQueryResult<T>>> {
  const executor = new RefineQueryExecutor<T>(config.table);
  return executor.execute({
    resource: config.table,
    filters: config.queryParams.filters,
    sorters: config.queryParams.sorters,
    pagination: config.queryParams.pagination,
    joinConfig: config.joinConfig,
    allowedFields: config.allowedFields,
  });
}

/**
 * 创建查询执行器工厂
 * 用于创建特定表的查询执行器实例
 */
export function createQueryExecutor<T extends UnknownRecord = UnknownRecord>(
  table: PgTable,
): RefineQueryExecutor<T> {
  return new RefineQueryExecutor<T>(table);
}

/**
 * 批量查询执行器
 * 用于执行多个相关查询
 */
export class BatchQueryExecutor {
  private queries: Array<Simplify<{
    name: string;
    executor: RefineQueryExecutor<UnknownRecord>;
    params: QueryExecutionParams<UnknownRecord>;
  }>> = [];

  /**
   * 添加查询
   */
  addQuery<T extends UnknownRecord = UnknownRecord>(
    name: string,
    executor: RefineQueryExecutor<T>,
    params: QueryExecutionParams<T>,
  ): this {
    this.queries.push({ name, executor: executor as RefineQueryExecutor<UnknownRecord>, params: params as QueryExecutionParams<UnknownRecord> });
    return this;
  }

  /**
   * 执行所有查询
   */
  async executeAll(): Promise<Readonly<Record<string, RefineQueryResult<UnknownRecord> | RefineQueryError>>> {
    const results: Record<string, RefineQueryResult<UnknownRecord> | RefineQueryError> = {};

    for (const query of this.queries) {
      const [error, result] = await query.executor.execute(query.params);
      results[query.name] = error || result!;
    }

    return results;
  }

  /**
   * 并行执行所有查询
   */
  async executeAllParallel(): Promise<Readonly<Record<string, RefineQueryResult<UnknownRecord> | RefineQueryError>>> {
    const promises = this.queries.map(async (query) => {
      const [error, result] = await query.executor.execute(query.params);
      return {
        name: query.name,
        result: error || result!,
      };
    });

    const results = await Promise.all(promises);

    return results.reduce<Record<string, RefineQueryResult<UnknownRecord> | RefineQueryError>>((acc, { name, result }) => {
      acc[name] = result;
      return acc;
    }, {});
  }

  /**
   * 清空查询队列
   */
  clear(): void {
    this.queries = [];
  }
}
