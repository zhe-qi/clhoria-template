import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./demo-api-key.handlers";
import * as routes from "./demo-api-key.routes";

export const demoApiKey = createRouter()
  .openapi(routes.publicRoute, handlers.publicRoute)
  .openapi(routes.protectedRoute, handlers.protectedRoute);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type DemoApiKeyRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
