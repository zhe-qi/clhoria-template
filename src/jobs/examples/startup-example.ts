import { randomUUID } from "node:crypto";

import logger from "@/lib/logger";

import { enqueueDemoWelcomeEmailJob } from "./demo-tasks";

/**
 * 示例: 任务系统启动时执行的初始化任务
 *
 * 使用方式:
 * ```typescript
 * import { demoJobSystemStartup } from "@/jobs/examples/startup-example";
 *
 * // 在 app.ts 中
 * await setupJobSystem(demoJobSystemStartup);
 * ```
 *
 * 注意: 这仅用于开发/演示目的,生产环境请移除或替换为实际的业务逻辑
 */
export async function demoJobSystemStartup(): Promise<void> {
  logger.info("[任务系统]: 执行示例启动任务");

  try {
    const job = await enqueueDemoWelcomeEmailJob({
      userId: `demo_user_${randomUUID()}`,
      email: "demo@example.com",
      displayName: "Clhoria Demo",
    });

    const jobId = "cached" in job ? job.jobId : job.id;
    logger.info(
      { jobId, taskName: "demo_send_welcome_email", cached: "cached" in job },
      "[任务系统]: 示例任务已入队",
    );
  }
  catch (error) {
    logger.warn({ error }, "[任务系统]: 示例任务入队失败");
  }
}
