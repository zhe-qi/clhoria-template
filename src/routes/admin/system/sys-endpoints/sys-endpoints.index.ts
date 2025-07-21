import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./sys-endpoints.handlers";
import * as routes from "./sys-endpoints.routes";

export const sysEndpoints = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.tree, handlers.tree)
  .openapi(routes.authEndpoints, handlers.authEndpoints)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SysEndpointsRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
