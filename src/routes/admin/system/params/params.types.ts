import type { z } from "zod";
import type * as routes from "./params.routes";

import type { systemParamResponseSchema } from "./params.schema";
import type { AppRouteHandler } from "@/types/lib";

/** Parameter type / 参数类型 */
export type Param = z.infer<typeof systemParamResponseSchema>;

/** Route type mapping / 路由类型映射 */
type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

/** Parameter route handler type / 参数路由 Handler 类型 */
export type SystemParamRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
