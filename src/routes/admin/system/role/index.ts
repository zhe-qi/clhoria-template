import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

export const adminSystemRoleRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getPermissions, handlers.getPermissions)
  .openapi(routes.savePermissions, handlers.savePermissions);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemRoleRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
