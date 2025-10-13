import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./user.handlers";
import * as routes from "./user.routes";

export const adminSystemUserRouter = createRouter()
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.create, handlers.create)
  .openapi(routes.list, handlers.list)
  .openapi(routes.saveRoles, handlers.saveRoles);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemUserRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
