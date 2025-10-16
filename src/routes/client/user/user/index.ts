import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

export const clientUserRouter = createRouter()
  .openapi(routes.getUserInfo, handlers.getUserInfo);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type ClientUserRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
