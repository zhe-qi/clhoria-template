import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./users.handlers";
import * as routes from "./users.routes";

export const clientUsers = createRouter()
  .openapi(routes.getUserInfo, handlers.getUserInfo);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type ClientUsersRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
