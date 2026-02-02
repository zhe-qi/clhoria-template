/**
 * 基础设施启动模块
 *
 * 负责初始化 pg-boss 等基础设施组件
 * 必须在应用启动时调用
 */
import logger from "@/lib/logger";

import boss from "./pg-boss-adapter";

let initialized = false;

/**
 * 初始化基础设施
 *
 * 包括：
 * - pg-boss 任务队列（会自动创建 pgboss schema 和相关表）
 * - Saga 协调器
 *
 * @example
 * // 在应用启动时调用
 * import { bootstrap } from "@/lib/infrastructure";
 * await bootstrap();
 */
export async function bootstrap(): Promise<void> {
  if (initialized) {
    return;
  }

  // 1. 初始化 pg-boss（必须先于其他组件）
  const bossInstance = boss;
  await bossInstance.start();
  logger.info("[PgBossAdapter]: pg-boss 已启动");

  // 2. 初始化 Saga 协调器（依赖 pg-boss，使用动态导入确保顺序）
  const { getSagaOrchestrator } = await import("./saga");
  await getSagaOrchestrator;
  logger.info("[Bootstrap]: Saga 协调器已初始化");

  initialized = true;
}

/**
 * 关闭基础设施
 *
 * 用于优雅关闭应用
 */
export async function shutdown(): Promise<void> {
  if (!initialized) {
    return;
  }

  const bossInstance = boss;
  await bossInstance.stop();
  logger.info("[Bootstrap]: pg-boss 已停止");

  initialized = false;
}
