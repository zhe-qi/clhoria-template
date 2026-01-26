import type * as routes from "./param.routes";

import type { AppRouteHandler } from "@/types/lib";

/** 路由类型映射 */
type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

/** 参数路由 Handler 类型 */
export type ParamRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
