import type { z } from "zod";
import type * as routes from "./dicts.routes";

import type { systemDictResponseSchema } from "./dicts.schema";
import type { AppRouteHandler } from "@/types/lib";

/** Dictionary type / 字典类型 */
export type Dict = z.infer<typeof systemDictResponseSchema>;

/** Route type mapping / 路由类型映射 */
type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

/** Dictionary route handler type / 字典路由 Handler 类型 */
export type SystemDictRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
