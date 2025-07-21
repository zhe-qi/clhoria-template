import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./sys-access-keys.handlers";
import * as routes from "./sys-access-keys.routes";

export const sysAccessKeys = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.remove, handlers.remove);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SysAccessKeysRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
