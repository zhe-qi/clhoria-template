import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./sys-users.handlers";
import * as routes from "./sys-users.routes";

export const sysUsers = createRouter()
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.create, handlers.create)
  .openapi(routes.assignRoles, handlers.assignRoles)
  .openapi(routes.list, handlers.list);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SysUsersRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
