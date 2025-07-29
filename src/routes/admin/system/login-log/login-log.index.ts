import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./login-log.handlers";
import * as routes from "./login-log.routes";

export const systemLoginLog = createRouter()
  .openapi(routes.list, handlers.list);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemLoginLogRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
