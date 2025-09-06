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
  .openapi(routes.getHealth, handlers.getHealth)
  // 定时任务管理路由
  .openapi(routes.getScheduledJobs, handlers.getScheduledJobs)
  .openapi(routes.createScheduledJob, handlers.createScheduledJob)
  .openapi(routes.updateScheduledJob, handlers.updateScheduledJob)
  .openapi(routes.toggleScheduledJob, handlers.toggleScheduledJob)
  .openapi(routes.executeScheduledJob, handlers.executeScheduledJob)
  .openapi(routes.getScheduledJobLogs, handlers.getScheduledJobLogs)
  .openapi(routes.deleteScheduledJob, handlers.deleteScheduledJob);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type QueueManagementRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
