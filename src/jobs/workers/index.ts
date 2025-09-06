/**
 * Workers统一管理
 */

import logger from "@/lib/logger";

import { emailWorker } from "./email-worker";
import { fileWorker } from "./file-worker";
import { systemWorker } from "./system-worker";
import { userWorker } from "./user-worker";

// 所有Worker实例
export const allWorkers = [
  emailWorker,
  fileWorker,
  userWorker,
  systemWorker,
];

// 启动所有Workers
export async function startAllWorkers(): Promise<void> {
  logger.info("[工作者]: 启动所有Workers");

  // Workers在创建时已经自动启动，这里只是日志输出
  const workerNames = allWorkers.map(worker => worker.name);

  logger.info({ workers: workerNames }, `[工作者]: Workers启动完成 - 共 ${allWorkers.length} 个`);
}

// 关闭所有Workers
export async function stopAllWorkers(): Promise<void> {
  logger.info("[工作者]: 正在关闭所有Workers");

  await Promise.all(
    allWorkers.map(async (worker) => {
      try {
        await worker.close();
        logger.info(`[工作者]: ${worker.name} 已关闭`);
      }
      catch (error) {
        logger.error(`[工作者]: ${worker.name} 关闭失败 - ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
  );

  logger.info("[工作者]: 所有已关闭");
}

// 获取Workers状态
export function getWorkersStatus() {
  return allWorkers.map(worker => ({
    name: worker.name,
    isRunning: worker.isRunning(),
    isPaused: worker.isPaused(),
  }));
}

// 暂停所有Workers
export async function pauseAllWorkers(): Promise<void> {
  logger.info("[工作者]: 暂停所有Workers");

  await Promise.all(
    allWorkers.map(async (worker) => {
      try {
        await worker.pause();
        logger.info(`[工作者]: ${worker.name} 已暂停`);
      }
      catch (error) {
        logger.error(`[工作者]: ${worker.name} 暂停失败 - ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
  );
}

// 恢复所有Workers
export async function resumeAllWorkers(): Promise<void> {
  logger.info("[工作者]: 恢复所有Workers");

  await Promise.all(
    allWorkers.map(async (worker) => {
      try {
        await worker.resume();
        logger.info(`[工作者]: ${worker.name} 已恢复`);
      }
      catch (error) {
        logger.error(`[工作者]: ${worker.name} 恢复失败 - ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
  );
}

// 导出单个Worker
export { emailWorker, fileWorker, systemWorker, userWorker };
