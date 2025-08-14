import * as HttpStatusCodes from "stoker/http-status-codes";

import * as scheduledJobsService from "@/services/system/scheduled-jobs";
import { pickContext } from "@/utils/tools/hono-helpers";

import type { SystemScheduledJobsRouteHandlerType } from "./scheduled-jobs.index";

/** 获取定时任务列表 */
export const list: SystemScheduledJobsRouteHandlerType<"list"> = async (c) => {
  const domain = c.get("userDomain");
  const query = c.req.valid("query");

  try {
    const result = await scheduledJobsService.getScheduledJobs({
      domain,
      params: query,
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json({ message: error.message || "获取任务列表失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/** 获取单个定时任务 */
export const getById: SystemScheduledJobsRouteHandlerType<"getById"> = async (c) => {
  const domain = c.get("userDomain");
  const { id } = c.req.valid("param");

  try {
    const job = await scheduledJobsService.getScheduledJobById(id, domain);
    return c.json(job, HttpStatusCodes.OK);
  }
  catch (error: any) {
    if (error instanceof Error && error.message === "任务不存在") {
      return c.json({ message: "任务不存在" }, HttpStatusCodes.NOT_FOUND);
    }
    // 对于其他错误，统一返回NOT_FOUND，避免暴露内部错误信息
    return c.json({ message: "任务不存在" }, HttpStatusCodes.NOT_FOUND);
  }
};

/** 创建定时任务 */
export const create: SystemScheduledJobsRouteHandlerType<"create"> = async (c) => {
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);
  const body = c.req.valid("json");

  try {
    const job = await scheduledJobsService.createScheduledJob({
      ...body,
      description: body.description || undefined,
      timezone: body.timezone || undefined,
      domain,
      createdBy: userId,
    });

    return c.json(job, HttpStatusCodes.OK);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key") || error.message?.includes("已存在")) {
      return c.json({ message: error.message || "任务名称已存在" }, HttpStatusCodes.CONFLICT);
    }
    return c.json({
      success: false,
      error: error.message || "参数验证失败",
    }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }
};

/** 更新定时任务 */
export const update: SystemScheduledJobsRouteHandlerType<"update"> = async (c) => {
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const job = await scheduledJobsService.updateScheduledJob(id, domain, {
    ...body,
    updatedBy: userId,
  });

  return c.json(job, HttpStatusCodes.OK);
};

/** 删除定时任务 */
export const remove: SystemScheduledJobsRouteHandlerType<"remove"> = async (c) => {
  const domain = c.get("userDomain");
  const { id } = c.req.valid("param");

  try {
    await scheduledJobsService.deleteScheduledJob(id, domain);
    return c.json({ message: "删除成功" }, HttpStatusCodes.OK);
  }
  catch (error: any) {
    if (error instanceof Error && error.message === "任务不存在") {
      return c.json({ message: "任务不存在" }, HttpStatusCodes.NOT_FOUND);
    }
    // 对于其他错误，统一返回NOT_FOUND，避免暴露内部错误信息
    return c.json({ message: "任务不存在" }, HttpStatusCodes.NOT_FOUND);
  }
};

/** 切换任务状态 */
export const toggleStatus: SystemScheduledJobsRouteHandlerType<"toggleStatus"> = async (c) => {
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);
  const { id } = c.req.valid("param");
  const { status } = c.req.valid("json");

  try {
    const job = await scheduledJobsService.toggleJobStatus(id, domain, status, userId);
    return c.json(job, HttpStatusCodes.OK);
  }
  catch (error: any) {
    if (error instanceof Error && error.message === "任务不存在") {
      return c.json({ message: "任务不存在" }, HttpStatusCodes.NOT_FOUND);
    }
    // 对于路由定义中不支持的错误状态码，我们统一返回NOT_FOUND
    return c.json({ message: "任务不存在" }, HttpStatusCodes.NOT_FOUND);
  }
};

/** 立即执行任务 */
export const executeNow: SystemScheduledJobsRouteHandlerType<"executeNow"> = async (c) => {
  const domain = c.get("userDomain");
  const { id } = c.req.valid("param");

  await scheduledJobsService.executeJobNow(id, domain);
  return c.json({ message: "执行请求已提交" }, HttpStatusCodes.OK);
};

/** 获取任务执行历史 */
export const getExecutionHistory: SystemScheduledJobsRouteHandlerType<"getExecutionHistory"> = async (c) => {
  const domain = c.get("userDomain");
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");

  // 将新的分页参数转换为旧格式
  const options = {
    page: Math.floor((query.skip || 0) / (query.take || 10)) + 1,
    limit: query.take || 10,
    status: query.where?.status,
    startDate: query.where?.startDate ? new Date(query.where.startDate) : undefined,
    endDate: query.where?.endDate ? new Date(query.where.endDate) : undefined,
  };

  const { data, total } = await scheduledJobsService.getJobExecutionHistory(id, domain, options);

  const result = {
    data,
    meta: {
      total,
      skip: query.skip || 0,
      take: query.take || 10,
    },
  };

  return c.json(result, HttpStatusCodes.OK);
};

/** 获取任务执行统计 */
export const getExecutionStats: SystemScheduledJobsRouteHandlerType<"getExecutionStats"> = async (c) => {
  const domain = c.get("userDomain");
  const { id } = c.req.valid("param");
  const { days } = c.req.valid("query");

  const stats = await scheduledJobsService.getJobExecutionStats(id, domain, days);
  return c.json(stats, HttpStatusCodes.OK);
};

/** 获取可用的任务处理器 */
export const getAvailableHandlers: SystemScheduledJobsRouteHandlerType<"getAvailableHandlers"> = async (c) => {
  const domain = c.get("userDomain");

  try {
    const handlers = await scheduledJobsService.getAvailableHandlers(domain);
    return c.json(handlers, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json({ message: error.message || "获取处理器列表失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/** 获取系统任务概览 */
export const getSystemOverview: SystemScheduledJobsRouteHandlerType<"getSystemOverview"> = async (c) => {
  const domain = c.get("userDomain");
  const { days } = c.req.valid("query");

  try {
    const overview = await scheduledJobsService.getSystemJobOverview(domain, days);
    return c.json(overview, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json({ message: error.message || "获取系统概览失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
