import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./auth.handlers";
import * as routes from "./auth.routes";

export const auth = createRouter()
  .openapi(routes.adminLogin, handlers.adminLogin)
  .openapi(routes.clientLogin, handlers.clientLogin)
  .openapi(routes.clientRegister, handlers.clientRegister);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type AuthRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
