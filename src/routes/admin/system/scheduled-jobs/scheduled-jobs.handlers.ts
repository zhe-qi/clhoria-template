import * as HttpStatusCodes from "stoker/http-status-codes";

import * as scheduledJobsService from "@/services/scheduled-jobs";
import { pickContext } from "@/utils/tools/hono-helpers";

import type { ScheduledJobsRouteHandlerType } from "./scheduled-jobs.index";

/** 获取定时任务列表 */
export const list: ScheduledJobsRouteHandlerType<"list"> = async (c) => {
  const domain = c.get("userDomain");
  const query = c.req.valid("query");

  try {
    const jobs = await scheduledJobsService.getScheduledJobs({
      domain,
      ...query,
    });

    return c.json(jobs, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json({ message: error.message || "获取任务列表失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/** 获取单个定时任务 */
export const getById: ScheduledJobsRouteHandlerType<"getById"> = async (c) => {
  const [domain] = pickContext(c, ["userDomain"]);
  const { id } = c.req.valid("param");

  try {
    const job = await scheduledJobsService.getScheduledJobById(id, domain);
    return c.json(job, HttpStatusCodes.OK);
  }
  catch (error: any) {
    if (error instanceof Error && error.message === "任务不存在") {
      return c.json({ message: "任务不存在" }, HttpStatusCodes.NOT_FOUND);
    }
    return c.json({ message: error.message || "获取任务失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/** 创建定时任务 */
export const create: ScheduledJobsRouteHandlerType<"create"> = async (c) => {
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
export const update: ScheduledJobsRouteHandlerType<"update"> = async (c) => {
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
export const remove: ScheduledJobsRouteHandlerType<"remove"> = async (c) => {
  const [domain] = pickContext(c, ["userDomain"]);
  const { id } = c.req.valid("param");

  await scheduledJobsService.deleteScheduledJob(id, domain);
  return c.json({ message: "删除成功" }, HttpStatusCodes.OK);
};

/** 切换任务状态 */
export const toggleStatus: ScheduledJobsRouteHandlerType<"toggleStatus"> = async (c) => {
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);
  const { id } = c.req.valid("param");
  const { status } = c.req.valid("json");

  const job = await scheduledJobsService.toggleJobStatus(id, domain, status, userId);
  return c.json(job, HttpStatusCodes.OK);
};

/** 立即执行任务 */
export const executeNow: ScheduledJobsRouteHandlerType<"executeNow"> = async (c) => {
  const [domain] = pickContext(c, ["userDomain"]);
  const { id } = c.req.valid("param");

  await scheduledJobsService.executeJobNow(id, domain);
  return c.json({ message: "执行请求已提交" }, HttpStatusCodes.OK);
};

/** 获取任务执行历史 */
export const getExecutionHistory: ScheduledJobsRouteHandlerType<"getExecutionHistory"> = async (c) => {
  const [domain] = pickContext(c, ["userDomain"]);
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");

  // 转换日期字符串为Date对象
  const options = {
    ...query,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  };

  const history = await scheduledJobsService.getJobExecutionHistory(id, domain, options);
  return c.json(history, HttpStatusCodes.OK);
};

/** 获取任务执行统计 */
export const getExecutionStats: ScheduledJobsRouteHandlerType<"getExecutionStats"> = async (c) => {
  const [domain] = pickContext(c, ["userDomain"]);
  const { id } = c.req.valid("param");
  const { days } = c.req.valid("query");

  const stats = await scheduledJobsService.getJobExecutionStats(id, domain, days);
  return c.json(stats, HttpStatusCodes.OK);
};

/** 获取可用的任务处理器 */
export const getAvailableHandlers: ScheduledJobsRouteHandlerType<"getAvailableHandlers"> = async (c) => {
  const [domain] = pickContext(c, ["userDomain"]);

  try {
    const handlers = await scheduledJobsService.getAvailableHandlers(domain);
    return c.json(handlers, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json({ message: error.message || "获取处理器列表失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/** 获取系统任务概览 */
export const getSystemOverview: ScheduledJobsRouteHandlerType<"getSystemOverview"> = async (c) => {
  const [domain] = pickContext(c, ["userDomain"]);
  const { days } = c.req.valid("query");

  try {
    const overview = await scheduledJobsService.getSystemJobOverview(domain, days);
    return c.json(overview, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json({ message: error.message || "获取系统概览失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
