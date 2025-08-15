import type { PgTable, SelectedFields } from "drizzle-orm/pg-core";

import { getTableConfig } from "drizzle-orm/pg-core";

import { formatJoinResults } from "@/utils/tools/format-result";

import type {
  QueryContext,
  QuerySelectBuilderModeType,
  ToResult,
  ValidatedParams,
} from "./types";

import { QueryError } from "./types";

/**
 * 执行查询并获取结果
 */
export async function executeQueries<TResult>(
  dataQuery: QuerySelectBuilderModeType<SelectedFields | undefined>,
  countQuery: unknown,
  validatedParams: ValidatedParams,
): Promise<ToResult<[TResult[], number]>> {
  try {
    const dataPromise = dataQuery.limit(validatedParams.take).offset(validatedParams.skip);

    const [rawData, countResult] = await Promise.all([dataPromise, countQuery]);

    // 安全地处理计数结果
    const total = Array.isArray(countResult) && countResult[0] && typeof countResult[0] === "object" && "value" in countResult[0]
      ? (countResult[0] as { value: number }).value
      : 0;

    // 安全地转换数据类型
    const data = Array.isArray(rawData) ? rawData as TResult[] : [];

    return [null, [data, total]];
  }
  catch (error) {
    const queryError = new QueryError(`执行查询失败: ${error instanceof Error ? error.message : String(error)}`);
    return [queryError, null];
  }
}

/**
 * 格式化查询结果
 */
export function formatQueryResults<TResult>(
  data: TResult[],
  validatedParams: ValidatedParams,
  context: QueryContext,
  tableAliases: Record<string, string>,
): TResult[] {
  if (!context.joinTables || !validatedParams.join) {
    return data;
  }

  const tableConfig = getTableConfig(context.table as PgTable);
  const mainTableName = tableConfig.name;

  if (!mainTableName) {
    return data;
  }

  // 类型安全的格式化，确保数据符合预期格式
  try {
    return formatJoinResults<TResult>(data as Record<string, unknown>[], mainTableName, tableAliases);
  }
  catch {
    // 如果格式化失败，返回原始数据
    return data;
  }
}
