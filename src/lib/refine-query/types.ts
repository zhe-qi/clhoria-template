/**
 * Refine 标准数据类型定义
 * 完全按照 Refine 官方文档实现
 */

// Refine 支持的所有 CRUD 操作符
export type CrudOperators
  // 相等性操作符
  = | "eq" // Equal
    | "ne" // Not equal

  // 比较操作符
    | "lt" // Less than
    | "gt" // Greater than
    | "lte" // Less than or equal to
    | "gte" // Greater than or equal to

  // 数组操作符
    | "in" // Included in an array
    | "nin" // Not included in an array
    | "ina" // Column contains every element in an array
    | "nina" // Column doesn't contain every element in an array

  // 字符串操作符
    | "contains" // Contains
    | "ncontains" // Doesn't contain
    | "containss" // Contains, case sensitive
    | "ncontainss" // Doesn't contain, case sensitive

  // 范围操作符
    | "between" // Between
    | "nbetween" // Not between

  // 空值操作符
    | "null" // Is null
    | "nnull" // Is not null

  // 字符串匹配操作符
    | "startswith" // Starts with
    | "nstartswith" // Doesn't start with
    | "startswiths" // Starts with, case sensitive
    | "nstartswiths" // Doesn't start with, case sensitive
    | "endswith" // Ends with
    | "nendswith" // Doesn't end with
    | "endswiths" // Ends with, case sensitive
    | "nendswiths" // Doesn't end with, case sensitive

  // 逻辑操作符
    | "or" // Logical OR
    | "and"; // Logical AND

/**
 * 逻辑过滤器接口
 * 用于字段级别的过滤条件
 */
export interface LogicalFilter {
  /** 要过滤的字段名 */
  field: string;
  /** 过滤操作符，排除逻辑操作符 */
  operator: Exclude<CrudOperators, "or" | "and">;
  /** 过滤值 */
  value: any;
}

/**
 * 条件过滤器接口
 * 用于组合多个过滤条件（AND/OR）
 */
export interface ConditionalFilter {
  /** 可选的键标识符 */
  key?: string;
  /** 逻辑操作符 */
  operator: Extract<CrudOperators, "or" | "and">;
  /** 子过滤条件数组 */
  value: (LogicalFilter | ConditionalFilter)[];
}

/**
 * CRUD 过滤器类型
 * 可以是逻辑过滤器或条件过滤器
 */
export type CrudFilter = LogicalFilter | ConditionalFilter;

/**
 * CRUD 过滤器数组
 * Refine 标准的过滤条件集合
 */
export type CrudFilters = CrudFilter[];

/**
 * 排序配置接口
 */
export interface CrudSort {
  /** 要排序的字段名 */
  field: string;
  /** 排序方向 */
  order: "asc" | "desc";
}

/**
 * CRUD 排序数组
 * Refine 标准的排序条件集合
 */
export type CrudSorting = CrudSort[];

/**
 * 分页配置接口
 */
export interface Pagination {
  /** 当前页码 */
  current?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 分页模式 */
  mode?: "client" | "server" | "off";
}

/**
 * Refine 查询参数接口
 * 标准的 useList 钩子参数
 */
export interface RefineQueryParams {
  /** 过滤条件 */
  filters?: CrudFilters;
  /** 排序条件 */
  sorters?: CrudSorting;
  /** 分页配置 */
  pagination?: Pagination;
}

/**
 * Refine 查询结果接口
 */
export interface RefineQueryResult<T> {
  /** 数据数组 */
  data: T[];
  /** 总记录数 */
  total: number;
}

/**
 * 基础记录接口
 */
export type BaseRecord = (
  | { id: string | number; code?: string }
  | { id?: string | number; code: string }
) & {
  [key: string]: any;
};

/**
 * 错误类型
 */
export class RefineQueryError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "RefineQueryError";
  }
}

/**
 * 查询执行参数接口
 */
export interface QueryExecutionParams<_T = BaseRecord> {
  /** 表或查询源 */
  resource: any;
  /** 过滤条件 */
  filters?: CrudFilters;
  /** 排序条件 */
  sorters?: CrudSorting;
  /** 分页配置 */
  pagination?: Pagination;
  /** 表列映射 */
  tableColumns?: Record<string, any>;
}

/**
 * 元组结果类型
 * 用于错误处理
 */
export type Result<T, E = RefineQueryError> = [E, null] | [null, T];
