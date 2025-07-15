import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./api-keys.handlers";
import * as routes from "./api-keys.routes";

export const apiKeys = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getById, handlers.getById)
  .openapi(routes.deleteById, handlers.deleteById)
  .openapi(routes.toggleStatus, handlers.toggleStatus);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type ApiKeysRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
