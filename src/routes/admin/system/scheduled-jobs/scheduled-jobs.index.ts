import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./scheduled-jobs.handlers";
import * as routes from "./scheduled-jobs.routes";

export const systemScheduledJobs = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getAvailableHandlers, handlers.getAvailableHandlers)
  .openapi(routes.getSystemOverview, handlers.getSystemOverview)
  .openapi(routes.getById, handlers.getById)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.toggleStatus, handlers.toggleStatus)
  .openapi(routes.executeNow, handlers.executeNow)
  .openapi(routes.getExecutionHistory, handlers.getExecutionHistory)
  .openapi(routes.getExecutionStats, handlers.getExecutionStats);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemScheduledJobsRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
