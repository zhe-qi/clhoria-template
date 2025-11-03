import type { Simplify } from "type-fest";

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

import type { Pagination } from "./schemas";

/**
 * 分页计算结果接口
 */
export type PaginationCalculation = Simplify<{
  /** 偏移量（跳过的记录数） */
  offset: number;
  /** 限制数量（每页记录数） */
  limit: number;
  /** 当前页码 */
  current: number;
  /** 每页大小 */
  pageSize: number;
  /** 分页模式 */
  mode: "client" | "server" | "off";
}>;

/**
 * 分页元数据接口
 */
export type PaginationMeta = Simplify<{
  /** 当前页码 */
  current: number;
  /** 每页大小 */
  pageSize: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  pageCount: number;
  /** 是否有上一页 */
  hasPrev: boolean;
  /** 是否有下一页 */
  hasNext: boolean;
}>;

/**
 * 分页处理器类
 */
export class PaginationHandler {
  private defaultPageSize = DEFAULT_PAGE_SIZE;
  private maxPageSize = MAX_PAGE_SIZE;

  /**
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
   * 生成分页元数据
   */
  generateMeta(
    current: number,
    pageSize: number,
    total: number,
  ): PaginationMeta {
    const pageCount = Math.ceil(total / pageSize);

    return {
      current,
      pageSize,
      total,
      pageCount,
      hasPrev: current > 1,
      hasNext: current < pageCount,
    };
  }

  /**
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

  /**
   * 设置默认每页大小
   */
  setDefaultPageSize(size: number): void {
    if (size > 0 && size <= this.maxPageSize) {
      this.defaultPageSize = size;
    }
  }

  /**
   * 设置最大每页大小
   */
  setMaxPageSize(size: number): void {
    if (size > 0) {
      this.maxPageSize = size;
    }
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return {
      defaultPageSize: this.defaultPageSize,
      maxPageSize: this.maxPageSize,
    };
  }
}

// 全局分页处理器实例
export const paginationHandler = new PaginationHandler();

/**
 * 便捷函数：计算分页参数
 */
export function calculatePagination(pagination?: Pagination): PaginationCalculation {
  return paginationHandler.calculate(pagination);
}

/**
 * 便捷函数：生成分页元数据
 */
export function generatePaginationMeta(
  current: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  return paginationHandler.generateMeta(current, pageSize, total);
}

/**
 * 便捷函数：验证分页参数
 */
export function validatePagination(pagination?: Pagination): Readonly<{ valid: boolean; errors: readonly string[] }> {
  return paginationHandler.validate(pagination);
}

/**
 * 应用客户端分页
 * 在内存中对数据进行分页处理
 */
export function applyClientPagination<T>(
  data: T[],
  pagination: PaginationCalculation,
): T[] {
  if (pagination.mode === "off") {
    return data;
  }

  const { offset, limit } = pagination;
  return data.slice(offset, offset + limit);
}

/**
 * 计算偏移量和限制
 * 用于 SQL 查询的 OFFSET 和 LIMIT
 */
export function getOffsetLimit(
  current: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Readonly<{ offset: number; limit: number }> {
  const validCurrent = Math.max(1, current);
  const validPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));

  return {
    offset: (validCurrent - 1) * validPageSize,
    limit: validPageSize,
  };
}

/**
 * 检查是否需要分页
 */
export function shouldPaginate(pagination?: Pagination): boolean {
  return pagination?.mode !== "off";
}

/**
 * 规范化分页参数
 * 确保分页参数在有效范围内
 */
export function normalizePagination(pagination?: Pagination): Pagination {
  return {
    current: Math.max(1, pagination?.current ?? 1),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, pagination?.pageSize ?? DEFAULT_PAGE_SIZE)),
    mode: pagination?.mode ?? "server",
  };
}
