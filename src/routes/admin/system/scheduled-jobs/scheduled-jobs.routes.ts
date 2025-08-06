import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";

import {
  insertSystemScheduledJobsSchema,
  patchSystemScheduledJobsSchema,
  selectSystemJobExecutionLogsSchema,
  selectSystemScheduledJobsSchema,
} from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { PaginationParamsSchema } from "@/lib/pagination";

const routePrefix = "/system/scheduled-jobs";
const tags = [`${routePrefix}（定时任务管理）`];

const errorResponseSchema = z.object({ message: z.string() });

// 查询参数 Schema
const ScheduledJobsQuerySchema = PaginationParamsSchema.extend({
  search: z.string().meta({ describe: "搜索关键词" }).optional(),
  status: z.coerce.number().int().min(0).max(2).meta({ describe: "任务状态: 0=禁用 1=启用 2=暂停" }).optional(),
  handlerName: z.string().meta({ describe: "处理器名称" }).optional(),
});

// 执行历史查询参数
const ExecutionHistoryQuerySchema = PaginationParamsSchema.extend({
  status: z.string().meta({ describe: "执行状态" }).optional(),
  startDate: z.string().datetime().meta({ describe: "开始日期" }).optional(),
  endDate: z.string().datetime().meta({ describe: "结束日期" }).optional(),
});

// 状态切换参数
const ToggleStatusSchema = z.object({
  status: z.number().int().min(0).max(2).meta({ describe: "新状态: 0=禁用 1=启用 2=暂停" }),
});

// 统计查询参数
const StatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30).meta({ describe: "统计天数" }),
});

/** 获取定时任务列表 */
export const list = createRoute({
  method: "get",
  path: routePrefix,
  tags,
  summary: "获取定时任务列表",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.READ,
  },
  request: {
    query: ScheduledJobsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSystemScheduledJobsSchema),
      "获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ScheduledJobsQuerySchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      errorResponseSchema,
      "服务器内部错误",
    ),
  },
});

/** 获取单个定时任务 */
export const getById = createRoute({
  method: "get",
  path: `${routePrefix}/{id}`,
  tags,
  summary: "获取单个定时任务",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.READ,
  },
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectSystemScheduledJobsSchema, "获取成功"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "任务不存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      errorResponseSchema,
      "服务器内部错误",
    ),
  },
});

/** 创建定时任务 */
export const create = createRoute({
  method: "post",
  path: routePrefix,
  tags,
  summary: "创建定时任务",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.CREATE,
  },
  request: {
    body: jsonContentRequired(insertSystemScheduledJobsSchema, "创建参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectSystemScheduledJobsSchema, "创建成功"),
    [HttpStatusCodes.CONFLICT]: jsonContent(errorResponseSchema, "任务名称已存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      z.object({ success: z.boolean(), error: z.string() }),
      "参数验证失败",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      errorResponseSchema,
      "服务器内部错误",
    ),
  },
});

/** 更新定时任务 */
export const update = createRoute({
  method: "patch",
  path: `${routePrefix}/{id}`,
  tags,
  summary: "更新定时任务",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.UPDATE,
  },
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(patchSystemScheduledJobsSchema, "更新参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectSystemScheduledJobsSchema, "更新成功"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "任务不存在"),
    [HttpStatusCodes.CONFLICT]: jsonContent(errorResponseSchema, "任务名称已存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSystemScheduledJobsSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "参数验证失败",
    ),
  },
});

/** 删除定时任务 */
export const remove = createRoute({
  method: "delete",
  path: `${routePrefix}/{id}`,
  tags,
  summary: "删除定时任务",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.DELETE,
  },
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "删除成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "任务不存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
  },
});

/** 切换任务状态 */
export const toggleStatus = createRoute({
  method: "patch",
  path: `${routePrefix}/{id}/status`,
  tags,
  summary: "切换任务状态",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.UPDATE,
  },
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(ToggleStatusSchema, "状态参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectSystemScheduledJobsSchema, "状态切换成功"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "任务不存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ToggleStatusSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "参数验证失败",
    ),
  },
});

/** 立即执行任务 */
export const executeNow = createRoute({
  method: "post",
  path: `${routePrefix}/{id}/execute`,
  tags,
  summary: "立即执行任务",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.UPDATE,
  },
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "执行请求已提交",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "任务不存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
  },
});

/** 获取任务执行历史 */
export const getExecutionHistory = createRoute({
  method: "get",
  path: `${routePrefix}/{id}/history`,
  tags,
  summary: "获取任务执行历史",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.READ,
  },
  request: {
    params: IdUUIDParamsSchema,
    query: ExecutionHistoryQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSystemJobExecutionLogsSchema),
      "获取成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "任务不存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ExecutionHistoryQuerySchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "参数验证失败",
    ),
  },
});

/** 获取任务执行统计 */
export const getExecutionStats = createRoute({
  method: "get",
  path: `${routePrefix}/{id}/stats`,
  tags,
  summary: "获取任务执行统计",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.READ,
  },
  request: {
    params: IdUUIDParamsSchema,
    query: StatsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        totalExecutions: z.number().meta({ describe: "总执行次数" }),
        successfulExecutions: z.number().meta({ describe: "成功执行次数" }),
        failedExecutions: z.number().meta({ describe: "失败执行次数" }),
        averageDuration: z.number().meta({ describe: "平均执行时间(毫秒)" }),
        lastExecution: z.date().nullable().meta({ describe: "最后执行时间" }),
        successRate: z.number().meta({ describe: "成功率(百分比)" }),
      }),
      "获取成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "任务不存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(StatsQuerySchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "参数验证失败",
    ),
  },
});

/** 获取可用的任务处理器 */
export const getAvailableHandlers = createRoute({
  method: "get",
  path: `${routePrefix}/handlers`,
  tags,
  summary: "获取可用的任务处理器",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.READ,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(
        z.object({
          name: z.string().meta({ describe: "处理器名称" }),
          description: z.string().meta({ describe: "处理器描述" }),
          filePath: z.string().meta({ describe: "文件路径" }),
          isActive: z.boolean().meta({ describe: "是否激活" }),
        }),
      ),
      "获取成功",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      errorResponseSchema,
      "服务器内部错误",
    ),
  },
});

/** 获取系统任务概览 */
export const getSystemOverview = createRoute({
  method: "get",
  path: `${routePrefix}/overview`,
  tags,
  summary: "获取系统任务概览",
  permission: {
    resource: PermissionResource.SYSTEM_SCHEDULED_JOBS,
    action: PermissionAction.READ,
  },
  request: {
    query: StatsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        totalExecutions: z.number().meta({ describe: "总执行次数" }),
        successfulExecutions: z.number().meta({ describe: "成功执行次数" }),
        failedExecutions: z.number().meta({ describe: "失败执行次数" }),
        jobStats: z.record(z.string(), z.object({
          total: z.number(),
          successful: z.number(),
          failed: z.number(),
          avgDuration: z.number(),
        })).meta({ describe: "任务统计" }),
        dailyStats: z.record(z.string(), z.object({
          total: z.number(),
          successful: z.number(),
          failed: z.number(),
        })).meta({ describe: "每日统计" }),
      }),
      "获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(StatsQuerySchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      errorResponseSchema,
      "服务器内部错误",
    ),
  },
});
