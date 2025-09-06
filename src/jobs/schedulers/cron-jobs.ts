/**
 * 定时任务定义 - 使用 upsertJobScheduler 分布式安全
 */

import logger from "@/lib/logger";

import {
  emailQueue,
  fileQueue,
  systemQueue,
  userQueue,
} from "../queues";

/**
 * 注册所有定时任务
 * 使用 upsertJobScheduler 保证分布式环境下的安全性
 */
export async function registerCronJobs(): Promise<void> {
  logger.info("[定时任务]: 开始注册定时任务");

  try {
    const tasks = [];

    // 每天凌晨2点执行系统备份
    await systemQueue.upsertJobScheduler(
      "daily-backup",
      {
        pattern: "0 2 * * *", // CRON: 每天2:00 AM
      },
      {
        name: "backup",
        data: {
          task: "backup",
          params: {
            databases: ["main", "logs"],
            compression: true,
          },
        },
      },
    );
    tasks.push({ name: "每日系统备份", schedule: "2:00 AM", queue: "system" });

    // 每天凌晨3点执行系统清理
    await systemQueue.upsertJobScheduler(
      "daily-cleanup",
      {
        pattern: "0 3 * * *", // CRON: 每天3:00 AM
      },
      {
        name: "cleanup",
        data: {
          task: "cleanup",
          params: {
            cleanTypes: ["logs", "temp_files", "cache", "sessions"],
            daysToKeep: 7,
          },
        },
      },
    );
    tasks.push({ name: "每日系统清理", schedule: "3:00 AM", queue: "system" });

    // 每周一上午8点生成周报
    await systemQueue.upsertJobScheduler(
      "weekly-report",
      {
        pattern: "0 8 * * 1", // CRON: 每周一8:00 AM
      },
      {
        name: "report",
        data: {
          task: "report",
          params: {
            reportType: "weekly",
            dateRange: {
              start: "7 days ago",
              end: "now",
            },
            recipients: ["admin@example.com"],
          },
        },
      },
    );
    tasks.push({ name: "每周报告生成", schedule: "周一 8:00 AM", queue: "system" });

    // 每月1号凌晨4点执行系统维护
    await systemQueue.upsertJobScheduler(
      "monthly-maintenance",
      {
        pattern: "0 4 1 * *", // CRON: 每月1号4:00 AM
      },
      {
        name: "maintenance",
        data: {
          task: "maintenance",
          params: {
            maintenanceTypes: ["database_optimize", "index_rebuild", "cache_refresh"],
            downtime: false,
          },
        },
      },
    );
    tasks.push({ name: "每月系统维护", schedule: "每月1号 4:00 AM", queue: "system" });

    // 每6小时检查并清理过期用户数据
    await userQueue.upsertJobScheduler(
      "user-data-cleanup",
      {
        pattern: "0 */6 * * *", // CRON: 每6小时
      },
      {
        name: "cleanup",
        data: {
          userId: "system",
          action: "cleanup",
          data: {
            retentionDays: 90,
            dataTypes: ["temp_uploads", "expired_sessions"],
          },
        },
      },
    );
    tasks.push({ name: "用户数据清理", schedule: "每6小时", queue: "user" });

    // 每天上午9点发送系统状态邮件
    await emailQueue.upsertJobScheduler(
      "daily-status-email",
      {
        pattern: "0 9 * * *", // CRON: 每天9:00 AM
      },
      {
        name: "system",
        data: {
          to: "admin@example.com",
          subject: "系统日常状态报告",
          content: "系统运行正常",
          template: "system-status",
          variables: {
            date: new Date().toISOString().split("T")[0],
          },
        },
      },
    );
    tasks.push({ name: "每日状态邮件", schedule: "9:00 AM", queue: "email" });

    // 每30分钟清理临时文件
    await fileQueue.upsertJobScheduler(
      "temp-files-cleanup",
      {
        every: 30 * 60 * 1000, // 30分钟
      },
      {
        name: "delete",
        data: {
          filePath: "/tmp/*",
          operation: "delete",
          options: {
            permanent: true,
            pattern: "*.tmp",
            olderThan: 3600000, // 1小时前的文件
          },
        },
      },
    );
    tasks.push({ name: "临时文件清理", schedule: "每30分钟", queue: "file" });

    // 汇总日志
    const taskSummary = tasks.reduce((acc, task) => {
      acc[task.name] = `${task.schedule} (${task.queue})`;
      return acc;
    }, {} as Record<string, string>);

    logger.info(taskSummary, `[定时任务]: 定时任务注册完成 - 共 ${tasks.length} 个任务`);
  }
  catch (error) {
    logger.error(`[定时任务]: 定时任务注册失败 - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 获取所有已注册的定时任务
 */
export async function getScheduledJobs() {
  const scheduledJobs = [];

  try {
    // 获取各队列的定时任务
    const [emailJobs, fileJobs, userJobs, systemJobs] = await Promise.all([
      emailQueue.getRepeatableJobs(),
      fileQueue.getRepeatableJobs(),
      userQueue.getRepeatableJobs(),
      systemQueue.getRepeatableJobs(),
    ]);

    scheduledJobs.push(
      ...emailJobs.map(job => ({ ...job, queue: "email" })),
      ...fileJobs.map(job => ({ ...job, queue: "file" })),
      ...userJobs.map(job => ({ ...job, queue: "user" })),
      ...systemJobs.map(job => ({ ...job, queue: "system" })),
    );

    return scheduledJobs;
  }
  catch (error) {
    logger.error(`[定时任务]: 获取定时任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 移除指定的定时任务
 */
export async function removeScheduledJob(queueName: string, jobKey: string): Promise<boolean> {
  try {
    let queue;
    switch (queueName) {
      case "email":
        queue = emailQueue;
        break;
      case "file":
        queue = fileQueue;
        break;
      case "user":
        queue = userQueue;
        break;
      case "system":
        queue = systemQueue;
        break;
      default:
        throw new Error(`未知队列: ${queueName}`);
    }

    const result = await queue.removeRepeatableByKey(jobKey);
    logger.info(`[定时任务]: ${result ? "成功" : "失败"}移除定时任务 ${queueName}/${jobKey}`);
    return result;
  }
  catch (error) {
    logger.error(`[定时任务]: 移除定时任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
