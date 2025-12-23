import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

const systemUsersRouter = createRouter()
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.create, handlers.create)
  .openapi(routes.list, handlers.list)
  .openapi(routes.saveRoles, handlers.saveRoles);

export default systemUsersRouter;

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemUsersRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
