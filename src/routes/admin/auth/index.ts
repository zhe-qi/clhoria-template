import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

export const auth = createRouter()
  .openapi(routes.login, handlers.login)
  .openapi(routes.refreshToken, handlers.refreshToken)
  .openapi(routes.logout, handlers.logout)
  .openapi(routes.getIdentity, handlers.getIdentity)
  .openapi(routes.getPermissions, handlers.getPermissions)
  .openapi(routes.createChallenge, handlers.createChallenge)
  .openapi(routes.redeemChallenge, handlers.redeemChallenge);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type AuthRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
