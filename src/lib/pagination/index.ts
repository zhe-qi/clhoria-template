import type { PaginatedParams, PaginatedToResult } from "@/types/pagination";

import db from "@/db";

import {
  applyFiltersToQuery,
  applyJoinsToQuery,
  applySortingToQuery,
  buildCountQuery,
  buildQueryContext,
} from "./query-builders";
import { executeQueries, formatQueryResults } from "./query-executors";
// 导入功能模块
import { validateParams } from "./validators";

/**
 * 执行分页查询，传入声明式参数，返回分页结果
 * @returns 返回元组 [error, result]，互斥关系：有 error 时 result 为 null，无 error 时 result 非空
 */
export default async function paginatedQuery<TResult>(paginatedParams: PaginatedParams): PaginatedToResult<TResult> {
  const { table, params, joinTables, domain } = paginatedParams;

  // 1. 验证参数
  const [paramError, validatedParams] = validateParams(params);
  if (paramError) {
    return [paramError, null];
  }

  // 2. 构建查询上下文
  const context = buildQueryContext(table, joinTables, domain);

  // 3. 构建基础查询
  let dataQuery = db.select().from(table);

  // 4. 应用 join 查询
  const [joinError, joinResult] = applyJoinsToQuery(dataQuery, validatedParams, context);
  if (joinError) {
    return [joinError, null];
  }
  const [joinedQuery, tableAliases] = joinResult;
  dataQuery = joinedQuery;

  // 5. 应用过滤条件
  const [filterError, filteredQuery] = applyFiltersToQuery(dataQuery, validatedParams, context);
  if (filterError) {
    return [filterError, null];
  }
  dataQuery = filteredQuery;

  // 6. 应用排序
  const [sortError, sortedQuery] = applySortingToQuery(dataQuery, validatedParams, context);
  if (sortError) {
    return [sortError, null];
  }
  dataQuery = sortedQuery;

  // 7. 构建计数查询
  const [countError, countQuery] = buildCountQuery(validatedParams, context);
  if (countError) {
    return [countError, null];
  }

  // 8. 执行查询
  const [executeError, executeResult] = await executeQueries<TResult>(
    dataQuery,
    countQuery,
    validatedParams,
  );
  if (executeError) {
    return [executeError, null];
  }
  const [data, total] = executeResult;

  // 9. 格式化结果
  const resultData = formatQueryResults(data, validatedParams, context, tableAliases);

  const result = {
    data: resultData,
    meta: { total, skip: validatedParams.skip, take: validatedParams.take },
  };

  return [null, result];
}

// 重新导出所有公共 API
export * from "./schema";
export * from "./types";
