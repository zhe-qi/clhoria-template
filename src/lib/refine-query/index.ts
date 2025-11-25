/**
 * Refine List Query
 * 不建议用于没经过认证的接口和c端接口
 */

// 过滤器功能
export {
  convertFiltersToSQL,
  extractFilterFields,
  FiltersConverter,
  validateFilterFields,
} from "./filters";

// 分页功能
export {
  applyClientPagination,
  calculatePagination,
  generatePaginationMeta,
  getOffsetLimit,
  normalizePagination,
  // 分页相关类型
  type PaginationCalculation,
  PaginationHandler,
  paginationHandler,
  type PaginationMeta,

  shouldPaginate,
  validatePagination,
} from "./pagination";

// 查询执行器
export {
  BatchQueryExecutor,
  createQueryExecutor,
  executeRefineQuery,
  RefineQueryExecutor,
} from "./query-executor";

// Zod Schemas
export {
  // 从 Zod schemas 推导的类型
  type ConditionalFilter,
  // Zod schemas
  ConditionalFilterSchema,
  type CrudFilter,
  type CrudFilters,
  CrudFilterSchema,
  CrudFiltersSchema,
  type CrudOperators,
  CrudOperatorsSchema,
  type CrudSort,
  type CrudSorting,
  CrudSortingSchema,
  CrudSortSchema,

  type LogicalFilter,
  LogicalFilterSchema,
  type Pagination,
  PaginationSchema,
  type ProcessedQueryParams,
  ProcessedQueryParamsSchema,
  type QueryMeta,
  QueryMetaSchema,
  type RefineQueryParams,
  RefineQueryParamsSchema,
  RefineResultSchema,
} from "./schemas";

// 排序器功能
export {
  addDefaultSorting,
  applyPrioritySorting,
  convertSortersToSQL,
  extractSorterFields,
  sanitizeSorters,
  SortersConverter,
  validateSorterFields,
} from "./sorters";

// 配置和工具类型
export type {
  JoinConfig,
  JoinDefinition,
  JoinType,
  QueryExecutionParams,
  RefineQueryConfig,
  RefineQueryError,
  RefineQueryResult,
  Result,
} from "./types";
