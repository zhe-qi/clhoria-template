import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

export const health = createRouter()
  .openapi(routes.get, handlers.get);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type HealthRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
