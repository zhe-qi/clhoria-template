import type { Simplify } from "type-fest";

import type { Pagination } from "./schemas";

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

/**
 * Pagination calculation result interface
 * 分页计算结果接口
 */
export type PaginationCalculation = Simplify<{
  /** Offset (number of records to skip) / 偏移量（跳过的记录数） */
  offset: number;
  /** Limit (records per page) / 限制数量（每页记录数） */
  limit: number;
  /** Current page number / 当前页码 */
  current: number;
  /** Page size / 每页大小 */
  pageSize: number;
  /** Pagination mode / 分页模式 */
  mode: "client" | "server" | "off";
}>;

/**
 * Pagination handler class
 * 分页处理器类
 */
export class PaginationHandler {
  private defaultPageSize = DEFAULT_PAGE_SIZE;
  private maxPageSize = MAX_PAGE_SIZE;

  /**
   * Calculate pagination parameters
   * 计算分页参数
   */
  calculate(pagination?: Pagination): PaginationCalculation {
    const mode = pagination?.mode ?? "server";
    const current = Math.max(1, pagination?.current ?? 1);
    const pageSize = Math.min(
      this.maxPageSize,
      Math.max(1, pagination?.pageSize ?? this.defaultPageSize),
    );

    const offset = (current - 1) * pageSize;
    const limit = pageSize;

    return {
      offset,
      limit,
      current,
      pageSize,
      mode,
    };
  }

  /**
   * Validate pagination parameters
   * 验证分页参数
   */
  validate(pagination?: Pagination): Readonly<{ valid: boolean; errors: readonly string[] }> {
    const errors: string[] = [];

    if (pagination) {
      if (pagination.current !== undefined) {
        if (pagination.current < 1) {
          errors.push("当前页码必须大于等于1");
        }
        if (!Number.isInteger(pagination.current)) {
          errors.push("当前页码必须是整数");
        }
      }

      if (pagination.pageSize !== undefined) {
        if (pagination.pageSize < 1) {
          errors.push("每页大小必须大于等于1");
        }
        if (pagination.pageSize > this.maxPageSize) {
          errors.push(`每页大小不能超过${this.maxPageSize}`);
        }
        if (!Number.isInteger(pagination.pageSize)) {
          errors.push("每页大小必须是整数");
        }
      }

      if (pagination.mode !== undefined) {
        const validModes = ["client", "server", "off"] as const;
        if (!validModes.includes(pagination.mode)) {
          errors.push(`分页模式必须是: ${validModes.join(", ")}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Global pagination handler instance / 全局分页处理器实例
export const paginationHandler = new PaginationHandler();

/**
 * Convenience function: calculate pagination parameters
 * 便捷函数：计算分页参数
 */
export function calculatePagination(pagination?: Pagination): PaginationCalculation {
  return paginationHandler.calculate(pagination);
}

/**
 * Convenience function: validate pagination parameters
 * 便捷函数：验证分页参数
 */
export function validatePagination(pagination?: Pagination): Readonly<{ valid: boolean; errors: readonly string[] }> {
  return paginationHandler.validate(pagination);
}
