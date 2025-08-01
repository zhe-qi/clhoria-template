import type { RouteConfig } from "@hono/zod-openapi";

import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./notices.handlers";
import * as routes from "./notices.routes";

export const systemNotices = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.get, handlers.get)
  .openapi(routes.create, handlers.create)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemNoticesRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T] & RouteConfig>;
