import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./sys-roles.handlers";
import * as routes from "./sys-roles.routes";

export const sysRoles = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.assignPermissions, handlers.assignPermissions)
  .openapi(routes.assignMenus, handlers.assignMenus)
  .openapi(routes.assignUsers, handlers.assignUsers);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SysRolesRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
