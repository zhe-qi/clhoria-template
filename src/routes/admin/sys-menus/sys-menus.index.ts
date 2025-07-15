import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./sys-menus.handlers";
import * as routes from "./sys-menus.routes";

export const sysMenus = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.tree, handlers.tree)
  .openapi(routes.getMenusByRole, handlers.getMenusByRole)
  .openapi(routes.getConstantRoutes, handlers.getConstantRoutes)
  .openapi(routes.getUserRoutes, handlers.getUserRoutes)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SysMenusRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
