import type { RouteConfig } from "@hono/zod-openapi";

import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./auth.handlers";
import * as routes from "./auth.routes";

export const auth = createRouter()
  .openapi(routes.adminLogin, handlers.adminLogin)
  .openapi(routes.refreshToken, handlers.refreshToken)
  .openapi(routes.logout, handlers.logout)
  .openapi(routes.getUserInfo, handlers.getUserInfo)
  .openapi(routes.getUserPermissions, handlers.getUserPermissions)
  .openapi(routes.getUserMenus, handlers.getUserMenus);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type AuthRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T] & RouteConfig>;
