import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./operation-log.handlers";
import * as routes from "./operation-log.routes";

export const operationLog = createRouter()
  .openapi(routes.list, handlers.list);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type OperationLogRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
