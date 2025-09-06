import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./queue-management.handlers";
import * as routes from "./queue-management.routes";

export const queueManagement = createRouter()
  .openapi(routes.getQueues, handlers.getQueues)
  .openapi(routes.getQueue, handlers.getQueue)
  .openapi(routes.getQueueJobs, handlers.getQueueJobs)
  .openapi(routes.getQueueStats, handlers.getQueueStats)
  .openapi(routes.pauseQueue, handlers.pauseQueue)
  .openapi(routes.resumeQueue, handlers.resumeQueue)
  .openapi(routes.getJob, handlers.getJob)
  .openapi(routes.retryJob, handlers.retryJob)
  .openapi(routes.removeJob, handlers.removeJob)
  .openapi(routes.promoteJob, handlers.promoteJob)
  .openapi(routes.getHealth, handlers.getHealth);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type QueueManagementRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
