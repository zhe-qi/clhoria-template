/**
 * 队列管理 - 业务逻辑处理器
 */

import {
  getAllQueuesInfo,
  getJobInfo,
  getQueueHealth,
  getQueueInfo,
  getQueueJobs as getQueueJobsService,
  pauseQueue as pauseQueueService,
  promoteJob as promoteJobService,
  removeJob as removeJobService,
  resumeQueue as resumeQueueService,
  retryJob as retryJobService,
} from "@/jobs/manager";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { Resp } from "@/utils/zod/response";

import type { QueueManagementRouteHandlerType } from "./queue-management.index";

export const getQueues: QueueManagementRouteHandlerType<"getQueues"> = async (c) => {
  try {
    const queues = await getAllQueuesInfo();
    return c.json(Resp.ok(queues), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("获取队列列表失败:", error);
    return c.json(Resp.fail("获取队列列表失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getQueue: QueueManagementRouteHandlerType<"getQueue"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const queue = await getQueueInfo(name);

    if (!queue) {
      return c.json(Resp.fail("队列不存在"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok(queue), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("获取队列详情失败:", error);
    return c.json(Resp.fail("获取队列详情失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getQueueJobs: QueueManagementRouteHandlerType<"getQueueJobs"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const { status, start, limit } = c.req.valid("query");

    const jobs = await getQueueJobsService(name, status, start, limit);
    return c.json(Resp.ok(jobs), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("获取任务列表失败:", error);
    if (error instanceof Error && error.message.includes("队列不存在")) {
      return c.json(Resp.fail("队列不存在"), HttpStatusCodes.NOT_FOUND);
    }
    return c.json(Resp.fail("获取任务列表失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getQueueStats: QueueManagementRouteHandlerType<"getQueueStats"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const queue = await getQueueInfo(name);

    if (!queue) {
      return c.json(Resp.fail("队列不存在"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok(queue.stats), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("获取队列统计失败:", error);
    return c.json(Resp.fail("获取队列统计失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const pauseQueue: QueueManagementRouteHandlerType<"pauseQueue"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const success = await pauseQueueService(name);

    if (!success) {
      return c.json(Resp.fail("队列不存在或暂停失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("暂停队列失败:", error);
    return c.json(Resp.fail("暂停队列失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const resumeQueue: QueueManagementRouteHandlerType<"resumeQueue"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const success = await resumeQueueService(name);

    if (!success) {
      return c.json(Resp.fail("队列不存在或恢复失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("恢复队列失败:", error);
    return c.json(Resp.fail("恢复队列失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getJob: QueueManagementRouteHandlerType<"getJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const job = await getJobInfo(id);

    if (!job) {
      return c.json(Resp.fail("任务不存在"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok(job), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("获取任务详情失败:", error);
    return c.json(Resp.fail("获取任务详情失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const retryJob: QueueManagementRouteHandlerType<"retryJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const success = await retryJobService(id);

    if (!success) {
      return c.json(Resp.fail("任务不存在或重试失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("重试任务失败:", error);
    return c.json(Resp.fail("重试任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const removeJob: QueueManagementRouteHandlerType<"removeJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const success = await removeJobService(id);

    if (!success) {
      return c.json(Resp.fail("任务不存在或删除失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("删除任务失败:", error);
    return c.json(Resp.fail("删除任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const promoteJob: QueueManagementRouteHandlerType<"promoteJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const success = await promoteJobService(id);

    if (!success) {
      return c.json(Resp.fail("任务不存在或提升失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("提升任务失败:", error);
    return c.json(Resp.fail("提升任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getHealth: QueueManagementRouteHandlerType<"getHealth"> = async (c) => {
  try {
    const health = await getQueueHealth();
    return c.json(Resp.ok(health), HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("获取健康状态失败:", error);
    return c.json(Resp.fail("获取健康状态失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
