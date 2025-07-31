import { logger } from "@/lib/logger";

import { JobQueueManager } from "./queue-manager";
import { JobPriority } from "./types";

/**
 * 队列管理器使用示例
 */
export async function exampleUsage() {
  const queueManager = new JobQueueManager();

  try {
    // 等待队列管理器初始化
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 1. 添加普通任务
    await queueManager.addJob("example-task", {
      message: "Hello World",
    }, {
      priority: JobPriority.NORMAL,
      category: "example",
    });

    // 2. 添加高优先级任务
    await queueManager.addJob("urgent-task", {
      action: "process-payment",
      amount: 100,
    }, {
      priority: JobPriority.HIGH,
      timeout: 10000, // 10秒超时
    });

    // 3. 批量添加任务
    const bulkJobs = Array.from({ length: 10 }, (_, i) => ({
      name: "batch-task",
      data: { index: i },
      options: { priority: JobPriority.LOW },
    }));

    await queueManager.addBulkJobs(bulkJobs);

    // 4. 获取队列状态
    const status = await queueManager.getQueueStatus();
    logger.info("队列状态", status);

    // 5. 获取性能指标
    const metrics = queueManager.getMetrics();
    logger.info("性能指标", metrics);

    // 6. 健康检查
    const health = await queueManager.healthCheck();
    logger.info("健康状态", health);

    // 7. 清理旧任务
    const cleaned = await queueManager.cleanJobs(
      60 * 60 * 1000, // 1小时前的任务
      50, // 最多清理50个
      "completed",
    );
    logger.info(`清理了 ${cleaned} 个已完成的任务`);
  }
  catch (error) {
    logger.error("队列操作失败", { error });
  }
  finally {
    // 优雅关闭
    await queueManager.gracefulShutdown(5000);
  }
}

// 导出供其他模块使用
export { JobQueueManager };
export { JobPriority } from "./types";
