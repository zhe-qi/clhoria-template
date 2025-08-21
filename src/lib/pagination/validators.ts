import type { PaginationParams, ToResult, ValidatedParams } from "./types";

import { OrderBySchema, PaginationParamsSchema, WhereConditionSchema } from "./schema";
import { ValidationError } from "./types";

/**
 * 验证分页参数
 */
export function validateParams(params: PaginationParams): ToResult<ValidatedParams> {
  try {
    const validatedParams = PaginationParamsSchema.parse(params);

    // 确保参数类型正确，处理可能的null值
    const result: ValidatedParams = {
      skip: validatedParams.skip ?? 0,
      take: validatedParams.take ?? 10,
      where: validatedParams.where,
      orderBy: validatedParams.orderBy,
      join: validatedParams.join ?? undefined,
    };

    return [null, result];
  }
  catch (error) {
    const validationError = new ValidationError(`参数验证失败: ${error instanceof Error ? error.message : String(error)}`);
    return [validationError, null];
  }
}

/**
 * 验证 where 条件
 */
export function validateWhereCondition(where: unknown): ToResult<unknown> {
  if (!where) {
    return [null, where];
  }

  const validWhere = WhereConditionSchema.safeParse(where);

  if (!validWhere.success) {
    const error = new ValidationError(`无效的 where 条件: ${validWhere.error.message}`);
    return [error, null];
  }

  return [null, validWhere.data];
}

/**
 * 验证排序条件
 */
export function validateOrderBy(orderBy: unknown): ToResult<unknown> {
  if (!orderBy) {
    return [null, orderBy];
  }

  const validOrderBy = OrderBySchema.safeParse(orderBy);
  if (!validOrderBy.success) {
    const error = new ValidationError(`无效的 orderBy 条件: ${validOrderBy.error.message}`);
    return [error, null];
  }

  return [null, validOrderBy.data];
}

/**
 * 检查值是否为有效的Where条件值 - 纯函数版本
 */
export function isValidWhereValue(value: unknown): value is unknown {
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
