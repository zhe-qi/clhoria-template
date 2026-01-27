import type { z } from "zod";
import type * as routes from "./dicts.routes";

import type { systemDictResponseSchema } from "./dicts.schema";
import type { AppRouteHandler } from "@/types/lib";

/** 字典类型 */
export type Dict = z.infer<typeof systemDictResponseSchema>;

/** 路由类型映射 */
type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

/** 字典路由 Handler 类型 */
export type SystemDictRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
