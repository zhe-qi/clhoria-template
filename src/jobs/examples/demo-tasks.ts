import type { Job, Processor } from "bullmq";

import logger from "@/lib/logger";

import type {
  ProcessorRegistration,
  ScheduledTaskConfig,
  TaskData,
} from "../config";

import { addJob } from "../lib/queue";

/**
 * 示例任务 - 发送欢迎邮件
 */
export const DEMO_WELCOME_EMAIL_TASK = "demo_send_welcome_email";

export interface DemoWelcomeEmailPayload extends TaskData {
  userId: string;
  email: string;
  displayName?: string;
}

export const demoWelcomeEmailProcessor: Processor<DemoWelcomeEmailPayload> = async (
  job: Job<DemoWelcomeEmailPayload>,
) => {
  const { userId, email, displayName } = job.data;

  logger.info(
    { jobId: job.id, userId, email },
    "[示例任务]: 正在发送欢迎邮件",
  );

  await new Promise(resolve => setTimeout(resolve, 500));

  logger.info(
    { jobId: job.id, email, displayName },
    "[示例任务]: 欢迎邮件发送完成",
  );

  return {
    deliveredAt: new Date().toISOString(),
    recipient: email,
  } satisfies Record<string, string>;
};

export async function enqueueDemoWelcomeEmailJob(
  data: DemoWelcomeEmailPayload,
) {
  return await addJob(
    DEMO_WELCOME_EMAIL_TASK,
    data,
    {
      idempotencyKey: `demo_welcome-${data.userId}`,
      removeOnComplete: true,
    },
  );
}

/**
 * 示例任务 - 系统心跳
 */
export const DEMO_SYSTEM_HEARTBEAT_TASK = "demo_system_heartbeat";

export interface DemoSystemHeartbeatPayload extends TaskData {
  triggeredBy: string;
  note?: string;
}

export const demoSystemHeartbeatProcessor: Processor<DemoSystemHeartbeatPayload> = async (
  job: Job<DemoSystemHeartbeatPayload>,
) => {
  logger.info(
    { jobId: job.id, payload: job.data, timestamp: job.timestamp },
    "[示例任务]: 系统心跳记录",
  );
};

export const demoHeartbeatSchedule: ScheduledTaskConfig = {
  name: DEMO_SYSTEM_HEARTBEAT_TASK,
  pattern: "* * * * *",
  data: {
    triggeredBy: "scheduler",
    note: "示例定时任务：每分钟记录一次系统状态",
  },
  options: {
    removeOnComplete: true,
  },
};

export const demoTaskProcessors: ProcessorRegistration[] = [
  { name: DEMO_WELCOME_EMAIL_TASK, processor: demoWelcomeEmailProcessor },
  { name: DEMO_SYSTEM_HEARTBEAT_TASK, processor: demoSystemHeartbeatProcessor },
];

export const demoScheduledTasks: ScheduledTaskConfig[] = [demoHeartbeatSchedule];
