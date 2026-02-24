import type * as routes from "./dicts.routes";

import type { AppRouteHandler } from "@/types/lib";

/** Route type mapping / 路由类型映射 */
type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

/** Dict route handler type / 字典路由 Handler 类型 */
export type DictRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
