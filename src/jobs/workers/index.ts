/* eslint-disable no-console */
/**
 * Workers统一管理
 */

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
  console.log("🚀 启动所有Workers...");

  // Workers在创建时已经自动启动，这里只是日志输出
  allWorkers.forEach((worker) => {
    console.log(`📡 Worker已启动: ${worker.name}`);
  });

  console.log(`✅ ${allWorkers.length} 个Workers启动完成`);
}

// 关闭所有Workers
export async function stopAllWorkers(): Promise<void> {
  console.log("🛑 正在关闭所有Workers...");

  await Promise.all(
    allWorkers.map(async (worker) => {
      try {
        await worker.close();
        console.log(`📡 Worker已关闭: ${worker.name}`);
      }
      catch (error) {
        console.error(`❌ Worker关闭失败: ${worker.name}`, error);
      }
    }),
  );

  console.log("✅ 所有Workers已关闭");
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
  console.log("⏸️ 暂停所有Workers...");

  await Promise.all(
    allWorkers.map(async (worker) => {
      try {
        await worker.pause();
        console.log(`⏸️ Worker已暂停: ${worker.name}`);
      }
      catch (error) {
        console.error(`❌ Worker暂停失败: ${worker.name}`, error);
      }
    }),
  );
}

// 恢复所有Workers
export async function resumeAllWorkers(): Promise<void> {
  console.log("▶️ 恢复所有Workers...");

  await Promise.all(
    allWorkers.map(async (worker) => {
      try {
        await worker.resume();
        console.log(`▶️ Worker已恢复: ${worker.name}`);
      }
      catch (error) {
        console.error(`❌ Worker恢复失败: ${worker.name}`, error);
      }
    }),
  );
}

// 导出单个Worker
export { emailWorker, fileWorker, systemWorker, userWorker };
