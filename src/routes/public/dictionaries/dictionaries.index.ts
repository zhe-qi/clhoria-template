import type { RouteConfig } from "@hono/zod-openapi";

import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./dictionaries.handlers";
import * as routes from "./dictionaries.routes";

export const dictionaries = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.get, handlers.get)
  .openapi(routes.batch, handlers.batch);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type DictionariesRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T] & RouteConfig>;
