import type * as routes from "./params.routes";

import type { AppRouteHandler } from "@/types/lib";

/** Route type mapping / 路由类型映射 */
type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

/** Param route handler type / 参数路由 Handler 类型 */
export type ParamRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
