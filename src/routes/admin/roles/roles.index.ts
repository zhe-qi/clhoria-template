import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./roles.handlers";
import * as routes from "./roles.routes";

export const roles = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getPermissions, handlers.getPermissions)
  .openapi(routes.addPermissions, handlers.addPermissions)
  .openapi(routes.addInherits, handlers.addInherits)
  .openapi(routes.removePermissions, handlers.removePermissions)
  .openapi(routes.removeInherits, handlers.removeInherits);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type RolesRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
