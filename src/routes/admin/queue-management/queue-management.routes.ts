/**
 * 队列管理 - OpenAPI路由定义
 */

import { createRoute, z } from "@hono/zod-openapi";

import type { JobInfo, QueueInfo, QueueStats } from "@/jobs/types";

import { RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent } from "@/lib/stoker/openapi/helpers";
import { respErr } from "@/utils";

// 路由配置
const queueRoutePrefix = "/queues";
const jobRoutePrefix = "/jobs";
const healthRoutePrefix = "/queue-health";

const queueTags = [`${queueRoutePrefix}（队列管理）`];
const jobTags = [`${jobRoutePrefix}（任务管理）`];
const healthTags = [`${healthRoutePrefix}（系统监控）`];

// 参数schemas
const QueueParamsSchema = z.object({
  name: z.string().min(1).openapi({
    param: { name: "name", in: "path" },
    description: "队列名称",
    example: "email",
  }),
});

const JobParamsSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: "id", in: "path" },
    description: "任务ID",
    example: "12345",
  }),
});

// 查询schemas
const JobsQuerySchema = z.object({
  status: z.enum(["waiting", "active", "completed", "failed", "delayed"]).optional().openapi({
    description: "任务状态筛选",
    example: "waiting",
  }),
  start: z.coerce.number().int().min(0).default(0).openapi({
    description: "起始位置",
    example: 0,
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
    description: "返回数量限制",
    example: 20,
  }),
});

// 响应schemas
const QueueStatsSchema: z.ZodType<QueueStats> = z.object({
  waiting: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  delayed: z.number().int().nonnegative(),
  paused: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
}).openapi({ description: "队列统计信息" });

const QueueInfoSchema: z.ZodType<QueueInfo> = z.object({
  name: z.string(),
  isPaused: z.boolean(),
  stats: QueueStatsSchema,
}).openapi({ description: "队列信息" });

// 使用与JobInfo类型完全匹配的schema
const JobInfoSchema: z.ZodType<JobInfo> = z.object({
  id: z.string(),
  name: z.string(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(["waiting", "active", "completed", "failed", "delayed", "paused"]),
  progress: z.number().int().min(0).max(100),
  attempts: z.number().int().nonnegative(),
  failedReason: z.string().optional(),
  processedOn: z.number().int().optional(),
  finishedOn: z.number().int().optional(),
  timestamp: z.number().int(),
}).openapi({ description: "任务信息" });

// 路由定义
export const getQueues = createRoute({
  method: "get",
  path: queueRoutePrefix,
  summary: "获取所有队列概览",
  description: "返回所有队列的基本信息和统计数据",
  tags: queueTags,
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(z.array(QueueInfoSchema)),
        },
      },
      description: "队列列表",
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const getQueue = createRoute({
  method: "get",
  path: `${queueRoutePrefix}/{name}`,
  summary: "获取指定队列详情",
  description: "返回指定队列的详细信息和统计数据",
  tags: queueTags,
  request: {
    params: QueueParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(QueueInfoSchema),
        },
      },
      description: "队列详情",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const getQueueJobs = createRoute({
  method: "get",
  path: `${queueRoutePrefix}/{name}/jobs`,
  summary: "获取队列任务列表",
  description: "返回指定队列的任务列表，支持状态筛选和分页",
  tags: queueTags,
  request: {
    params: QueueParamsSchema,
    query: JobsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(z.array(JobInfoSchema)),
        },
      },
      description: "任务列表",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const getQueueStats = createRoute({
  method: "get",
  path: `${queueRoutePrefix}/{name}/stats`,
  summary: "获取队列统计信息",
  description: "返回指定队列的详细统计数据",
  tags: queueTags,
  request: {
    params: QueueParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(QueueStatsSchema),
        },
      },
      description: "队列统计信息",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const pauseQueue = createRoute({
  method: "post",
  path: `${queueRoutePrefix}/{name}/pause`,
  summary: "暂停队列",
  description: "暂停指定队列的任务处理",
  tags: queueTags,
  request: {
    params: QueueParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(z.object({ success: z.boolean() })),
        },
      },
      description: "操作结果",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const resumeQueue = createRoute({
  method: "post",
  path: `${queueRoutePrefix}/{name}/resume`,
  summary: "恢复队列",
  description: "恢复指定队列的任务处理",
  tags: queueTags,
  request: {
    params: QueueParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(z.object({ success: z.boolean() })),
        },
      },
      description: "操作结果",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const getJob = createRoute({
  method: "get",
  path: `${jobRoutePrefix}/{id}`,
  summary: "获取任务详情",
  description: "根据ID获取任务的详细信息",
  tags: jobTags,
  request: {
    params: JobParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(JobInfoSchema),
        },
      },
      description: "任务详情",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const retryJob = createRoute({
  method: "post",
  path: `${jobRoutePrefix}/{id}/retry`,
  summary: "重试失败任务",
  description: "重试指定的失败任务",
  tags: jobTags,
  request: {
    params: JobParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(z.object({ success: z.boolean() })),
        },
      },
      description: "操作结果",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const removeJob = createRoute({
  method: "delete",
  path: `${jobRoutePrefix}/{id}`,
  summary: "删除任务",
  description: "删除指定的任务",
  tags: jobTags,
  request: {
    params: JobParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(z.object({ success: z.boolean() })),
        },
      },
      description: "操作结果",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const promoteJob = createRoute({
  method: "post",
  path: `${jobRoutePrefix}/{id}/promote`,
  summary: "提升延迟任务",
  description: "将延迟任务提升为立即执行",
  tags: jobTags,
  request: {
    params: JobParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(z.object({ success: z.boolean() })),
        },
      },
      description: "操作结果",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "资源不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

export const getHealth = createRoute({
  method: "get",
  path: healthRoutePrefix,
  summary: "获取队列健康状态",
  description: "返回所有队列的健康状态信息",
  tags: healthTags,
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: RefineResultSchema(z.record(z.string(), z.unknown())),
        },
      },
      description: "健康状态信息",
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});
