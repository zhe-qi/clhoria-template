import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

const systemRolesRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getPermissions, handlers.getPermissions)
  .openapi(routes.savePermissions, handlers.savePermissions);

export default systemRolesRouter;

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemRolesRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
