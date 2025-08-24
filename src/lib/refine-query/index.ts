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
  // 过滤和排序 schemas
  CrudFilterSchema,
  CrudFiltersSchema,
  CrudSortingSchema,
  CrudSortSchema,
  PaginationSchema,

  ProcessedQueryParamsSchema,
  type ProcessedQueryParamsType,
  QueryMetaSchema,
  type QueryMetaType,

  // 查询参数 schemas
  RefineQueryParamsSchema,
  // Schema 类型
  type RefineQueryParamsType,
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

export type {
  BaseRecord,
  ConditionalFilter,
  CrudFilter,
  CrudFilters,
  // 基础类型
  CrudOperators,
  CrudSort,
  CrudSorting,
  // Join 相关类型
  JoinConfig,
  JoinDefinition,
  JoinType,
  LogicalFilter,
  Pagination,

  QueryExecutionParams,
  RefineQueryConfig,
  RefineQueryError,
  // 查询相关类型
  RefineQueryParams,
  RefineQueryResult,
  Result,
} from "./types";
