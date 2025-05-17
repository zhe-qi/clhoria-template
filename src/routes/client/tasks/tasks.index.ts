import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./tasks.handlers";
import * as routes from "./tasks.routes";

export const tasks = createRouter()
  .openapi(routes.list, handlers.list);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type TasksRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
