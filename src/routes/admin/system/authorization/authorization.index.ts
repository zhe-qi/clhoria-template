import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./authorization.handlers";
import * as routes from "./authorization.routes";

export const systemAuthorization = createRouter()
  .openapi(routes.assignPermissionsToRole, handlers.assignPermissionsToRole)
  .openapi(routes.assignRoutesToRole, handlers.assignRoutesToRole)
  .openapi(routes.assignUsersToRole, handlers.assignUsersToRole)
  .openapi(routes.getUserRoutes, handlers.getUserRoutes)
  .openapi(routes.getRolePermissions, handlers.getRolePermissions)
  .openapi(routes.getRoleMenus, handlers.getRoleMenus);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemAuthorizationRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
