/**
 * Refine List Query
 * 不建议用于没经过认证的接口和c端接口
 */

// 转换器功能
export {
  addDefaultSorting,
  convertFiltersToSQL,
  convertSortersToSQL,
  FiltersConverter,
  SortersConverter,
  validateFilterFields,
  validateSorterFields,
} from "./converters";

// 分页功能
export {
  calculatePagination,
  type PaginationCalculation,
  PaginationHandler,
  paginationHandler,
  validatePagination,
} from "./pagination";

// 查询执行器
export {
  type DbInstance,
  executeRefineQuery,
  RefineQueryExecutor,
} from "./query-executor";

// Zod Schemas 和类型
export {
  type ConditionalFilter,
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
  type JoinConfig,
  type JoinDefinition,
  type JoinType,
  type LogicalFilter,
  LogicalFilterSchema,
  type Pagination,
  PaginationSchema,
  type QueryExecutionParams,
  type RefineQueryConfig,
  RefineQueryError,
  type RefineQueryParams,
  RefineQueryParamsSchema,
  type RefineQueryResult,
  RefineResultSchema,
  type Result,
} from "./schemas";
